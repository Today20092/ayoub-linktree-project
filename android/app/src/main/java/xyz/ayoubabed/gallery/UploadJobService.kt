package xyz.ayoubabed.gallery

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.job.JobInfo
import android.app.job.JobParameters
import android.app.job.JobScheduler
import android.app.job.JobService
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import kotlinx.coroutines.*

class UploadJobService : JobService() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var work: Job? = null
    private lateinit var store: Store
    override fun onCreate() { super.onCreate(); store = Store(this) }
    private fun notification(message: String): Notification {
        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(NotificationChannel("uploads", "Gallery uploads", NotificationManager.IMPORTANCE_LOW))
        return Notification.Builder(this, "uploads").setSmallIcon(R.drawable.ic_gallery)
            .setContentTitle("Ayoub Gallery").setContentText(message).setOngoing(true)
            .setContentIntent(PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT))
            .build()
    }
    override fun onStartJob(params: JobParameters): Boolean {
        setNotification(params, 7, notification("Preparing your photos"), JOB_END_NOTIFICATION_POLICY_REMOVE)
        work = scope.launch {
            try {
                store.recover()
                val batch = store.batch() ?: return@launch
                val token = store.token()
                if (token.isBlank() || batch.first != store.prefs.getString("site", "")) {
                    store.message("Reconnect this website in Settings, then resume."); return@launch
                }
                store.message("Uploading to ${batch.third}")
                for (item in store.items().filter { it.state == "queued" }) {
                    ensureActive()
                    var attempt = item.attempts
                    while (true) {
                        ensureActive()
                        store.state(item.id, "uploading", attempts = ++attempt)
                        try {
                            val state = GalleryApi.upload(this@UploadJobService, batch.first, batch.second, token, item, params.network)
                            ensureActive()
                            store.state(item.id, state)
                            break
                        } catch (error: CancellationException) { throw error }
                        catch (error: Exception) {
                            val retryable = error !is ApiException || SyncRules.retryable(error.code)
                            if (retryable && attempt < 4) {
                                store.state(item.id, "queued", "Connection interrupted. Retrying…", attempt)
                                delay(2000L shl (attempt - 1)); continue
                            }
                            store.state(item.id, "failed", error.message ?: "Upload interrupted.", attempt)
                            if (error is ApiException && error.code in listOf(401, 403, 404, 422)) {
                                store.message(error.message ?: "Check the connection and gallery."); return@launch
                            }
                            break
                        }
                    }
                    val items = store.items()
                    val done = items.count { it.state in listOf("uploaded", "skipped") }
                    getSystemService(NotificationManager::class.java).notify(7, notification("$done of ${items.size} photos complete"))
                }
                store.message(if (store.items().any { it.state == "failed" }) "Some photos need attention. Tap Retry." else "Batch complete. Sync again when new photos arrive.")
            } catch (_: CancellationException) { /* onStopJob owns rescheduling. */ }
            catch (_: Exception) { store.message("Upload interrupted. Your queue is saved. Tap Resume.") }
            finally { if (currentCoroutineContext().isActive) jobFinished(params, false) }
        }
        return true
    }
    override fun onStopJob(params: JobParameters): Boolean {
        work?.cancel()
        store.message("Waiting for a connection, or paused. Your queue is saved.")
        return params.stopReason != JobParameters.STOP_REASON_CANCELLED_BY_APP && params.stopReason != JobParameters.STOP_REASON_USER
    }
    override fun onDestroy() { scope.cancel(); super.onDestroy() }

    companion object {
        const val JOB_ID = 71
        fun schedule(context: Context, wifiOnly: Boolean): Boolean {
            val store = Store(context)
            val network = NetworkRequest.Builder().addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET).apply {
                if(wifiOnly) { addTransportType(NetworkCapabilities.TRANSPORT_WIFI); addCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED) }
            }.build()
            val info = JobInfo.Builder(JOB_ID, ComponentName(context, UploadJobService::class.java))
                .setUserInitiated(true).setRequiredNetwork(network)
                .setEstimatedNetworkBytes(0, store.items().filter { it.state == "queued" }.sumOf { it.size })
                .build()
            store.message(if(wifiOnly) "Queued. Waiting for unmetered Wi-Fi." else "Queued. Waiting for an internet connection.")
            return context.getSystemService(JobScheduler::class.java).schedule(info) == JobScheduler.RESULT_SUCCESS
        }
        fun pause(context: Context) {
            context.getSystemService(JobScheduler::class.java).cancel(JOB_ID)
            Store(context).message("Paused. Tap Resume when you’re ready.")
        }
    }
}
