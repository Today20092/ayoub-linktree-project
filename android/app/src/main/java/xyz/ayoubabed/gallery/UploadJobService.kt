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
            var reschedule = false
            try {
                store.recover()
                val batch = store.batch() ?: return@launch
                val token = store.token()
                if (token.isBlank() || batch.first != store.prefs.getString("site", "")) {
                    store.prefs.edit().putBoolean("uploads_paused", true).apply()
                    store.message("Reconnect this website in Settings, then resume."); return@launch
                }
                store.message("Uploading to ${batch.third}")
                val queued = store.items().filter { it.state == "queued" }
                val known = GalleryApi.known(batch.first, batch.second, token, queued.map { it.hash }, params.network)
                ensureActive()
                if (store.batch() != batch) return@launch
                queued.filter { it.hash in known }.forEach { store.state(it.id, "skipped") }
                for (original in store.items().filter { it.state == "queued" }) {
                    ensureActive()
                    if (store.batch() != batch) return@launch
                    var item = original
                    var attempt = item.attempts
                    while (true) {
                        ensureActive()
                        store.state(item.id, "uploading", attempts = ++attempt)
                        try {
                            if (item.watchPath.isNotBlank()) {
                                val photo = try {
                                    val file = WatchFiles.metadata(this@UploadJobService, WatchedFile(item.watchPath, item.uri, item.name, item.size, 0))
                                    val observed = store.watchEntries()[item.watchPath]?.file
                                    if (observed == null || !WatchRules.sameVersion(observed, file)) delay(WatchRules.SETTLE_MS)
                                    if (!WatchRules.sameVersion(file, WatchFiles.metadata(this@UploadJobService, file))) throw IncompletePhoto()
                                    WatchFiles.read(this@UploadJobService, file)
                                } catch (error: CancellationException) { throw error }
                                catch (error: IncompletePhoto) { throw error }
                                catch (error: Exception) { throw ApiException(400, error.message ?: "Photo is no longer readable. Restore the source file, then retry.") }
                                ensureActive()
                                if (photo.taken < (store.watch()?.since ?: 0)) { store.state(item.id, "skipped", "Outside the selected capture-time filter."); break }
                                item = store.refreshWatchedPhoto(item, photo) ?: break
                                if (item.hash != original.hash && item.hash in GalleryApi.known(batch.first, batch.second, token, listOf(item.hash), params.network)) {
                                    store.state(item.id, "skipped"); break
                                }
                            }
                            val state = GalleryApi.upload(this@UploadJobService, batch.first, batch.second, token, item, params.network)
                            ensureActive()
                            store.state(item.id, state)
                            break
                        } catch (error: CancellationException) { throw error }
                        catch (error: Exception) {
                            if (item.watchPath.isNotBlank() && (error is IncompletePhoto || error is ApiException && error.code == 400 && error.message.orEmpty().contains("Photo changed"))) {
                                store.state(item.id, if (attempt < 12) "queued" else "failed", "Photo is changing or incomplete. Check the source file, then retry.", attempt)
                                if (attempt < 12) reschedule = true
                                break
                            }
                            val retryable = error !is ApiException || SyncRules.retryable(error.code)
                            if (retryable && attempt < 4) {
                                store.state(item.id, "queued", "Connection interrupted. Retrying…", attempt)
                                delay(2000L shl (attempt - 1)); continue
                            }
                            if (retryable && item.watchPath.isNotBlank() && (error is java.io.IOException || error is ApiException)) {
                                store.state(item.id, "queued", "Waiting for the connection to recover.", 0)
                                reschedule = true
                            } else store.state(item.id, "failed", error.message ?: "Upload interrupted.", attempt)
                            if (error is ApiException && error.code in listOf(401, 403, 404)) {
                                store.prefs.edit().putBoolean("uploads_paused", true).apply()
                                store.message(error.message ?: "Check the connection and gallery."); return@launch
                            }
                            break
                        }
                    }
                    val items = store.items()
                    val done = items.count { it.state in listOf("uploaded", "skipped") }
                    getSystemService(NotificationManager::class.java).notify(7, notification("$done of ${items.size} photos complete"))
                }
                store.message(when {
                    reschedule -> "Waiting to retry unfinished photos."
                    store.items().any { it.state == "failed" } -> "Some photos need attention. Tap Retry."
                    store.watchLocked() -> "Uploads caught up. Watching for new arrivals."
                    else -> "Batch complete."
                })
            } catch (_: CancellationException) { /* onStopJob owns rescheduling. */ }
            catch (error: Exception) {
                reschedule = store.watch() != null && (error !is ApiException || SyncRules.retryable(error.code))
                if (!reschedule) store.prefs.edit().putBoolean("uploads_paused", true).apply()
                store.message(error.message ?: "Upload interrupted. Your queue is saved. Tap Resume.")
            }
            finally {
                if (currentCoroutineContext().isActive) {
                    val remaining = store.watch() != null && store.items().any { it.state == "queued" }
                    jobFinished(params, (reschedule || remaining) && !store.prefs.getBoolean("uploads_paused", false))
                }
            }
        }
        return true
    }
    override fun onStopJob(params: JobParameters): Boolean {
        work?.cancel()
        if (params.stopReason == JobParameters.STOP_REASON_USER) store.prefs.edit().putBoolean("uploads_paused", true).apply()
        store.message("Waiting for a connection, or paused. Your queue is saved.")
        return params.stopReason != JobParameters.STOP_REASON_CANCELLED_BY_APP && params.stopReason != JobParameters.STOP_REASON_USER
    }
    override fun onDestroy() { scope.cancel(); super.onDestroy() }

    companion object {
        const val JOB_ID = 71
        fun networkRequest(wifiOnly: Boolean): NetworkRequest =
            NetworkRequest.Builder().addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                // Tailscale is a VPN even when it is only used for DNS.
                .removeCapability(NetworkCapabilities.NET_CAPABILITY_NOT_VPN).apply {
                if(wifiOnly) { addTransportType(NetworkCapabilities.TRANSPORT_WIFI); addCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED) }
            }.build()

        fun jobInfo(context: Context, wifiOnly: Boolean, sizes: List<Long>, userInitiated: Boolean = true): JobInfo =
            JobInfo.Builder(JOB_ID, ComponentName(context, UploadJobService::class.java))
                .setUserInitiated(userInitiated).setRequiredNetwork(networkRequest(wifiOnly))
                .setEstimatedNetworkBytes(0, sizes.sum())
                // Each completed photo is durable; the whole batch need not fit in one run.
                .setMinimumNetworkChunkBytes(sizes.maxOrNull()?.coerceAtLeast(1) ?: 1)
                .build()

        fun pendingMessage(context: Context, wifiOnly: Boolean): String? {
            val scheduler = context.getSystemService(JobScheduler::class.java)
            if (scheduler.getPendingJob(JOB_ID) == null) return null
            return when(val reason = scheduler.getPendingJobReason(JOB_ID)) {
                JobScheduler.PENDING_JOB_REASON_EXECUTING -> null
                JobScheduler.PENDING_JOB_REASON_INVALID_JOB_ID -> null
                JobScheduler.PENDING_JOB_REASON_CONSTRAINT_CONNECTIVITY -> if(wifiOnly)
                    "Waiting for unmetered Wi-Fi. Turn off Wi-Fi only to use other connections."
                    else "Android is waiting for a usable internet network. VPN connections are allowed."
                JobScheduler.PENDING_JOB_REASON_BACKGROUND_RESTRICTION,
                JobScheduler.PENDING_JOB_REASON_APP_STANDBY -> "Android has restricted background uploads. Allow background usage in this app’s battery settings."
                JobScheduler.PENDING_JOB_REASON_USER -> "Android paused this upload. Tap Pause, then Resume."
                else -> "Queued by Android (reason $reason). Waiting for the transfer job to start."
            }
        }

        @Synchronized fun schedule(context: Context, wifiOnly: Boolean): Boolean {
            val store = Store(context)
            store.prefs.edit().putBoolean("uploads_paused", false).commit()
            val info = jobInfo(context, wifiOnly, store.items().filter { it.state == "queued" }.map { it.size })
            store.message("Queued. Asking Android to start the transfer…")
            return context.getSystemService(JobScheduler::class.java).schedule(info) == JobScheduler.RESULT_SUCCESS
        }
        @Synchronized fun scheduleAutomatic(context: Context) {
            Store(context).use { store ->
                if (store.watch() == null || store.prefs.getBoolean("uploads_paused", false)) return
                val scheduler = context.getSystemService(JobScheduler::class.java)
                if (scheduler.getPendingJob(JOB_ID) != null) return
                val items = store.items().filter { it.state == "queued" }
                if (items.isEmpty()) return
                val info = jobInfo(context, store.prefs.getBoolean("wifi", false), items.map { it.size }, userInitiated = false)
                try {
                    if (scheduler.schedule(info) != JobScheduler.RESULT_SUCCESS) store.message("Android could not schedule uploads. Tap Resume.")
                } catch (_: Exception) { store.message("Android could not schedule uploads. Tap Resume.") }
            }
        }
        @Synchronized fun pause(context: Context) {
            Store(context).use { it.prefs.edit().putBoolean("uploads_paused", true).commit() }
            context.getSystemService(JobScheduler::class.java).cancel(JOB_ID)
            Store(context).message("Paused. Tap Resume when you’re ready.")
        }
    }
}
