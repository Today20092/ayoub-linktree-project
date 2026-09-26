package xyz.ayoubabed.gallery

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.app.job.JobScheduler
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.IBinder
import android.os.PowerManager
import kotlinx.coroutines.*

class FolderWatchService : Service() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var work: Job? = null
    private lateinit var store: Store
    private var wakeLock: PowerManager.WakeLock? = null

    override fun onCreate() { super.onCreate(); store = Store(this) }
    override fun onBind(intent: Intent?): IBinder? = null
    private fun notification(message: String): Notification {
        getSystemService(NotificationManager::class.java).createNotificationChannel(
            NotificationChannel("watching", "Watched folder", NotificationManager.IMPORTANCE_LOW))
        val flags = PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        return Notification.Builder(this, "watching").setSmallIcon(R.drawable.ic_gallery)
            .setContentTitle("Watching for gallery photos").setContentText(message).setOngoing(true)
            .setContentIntent(PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java), flags))
            .addAction(Notification.Action.Builder(null, "Stop watching",
                PendingIntent.getService(this, 1, Intent(this, FolderWatchService::class.java).setAction(STOP), flags)).build())
            .build()
    }
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == STOP) {
            store.watchStatus("stopped", "Watching stopped. Queued uploads can finish.")
            UploadJobService.scheduleAutomatic(this)
            stopSelf()
            return START_NOT_STICKY
        }
        if (!store.watchLocked()) { stopSelf(); return START_NOT_STICKY }
        startForeground(8, notification("Checking the selected folder"), ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
        if (work?.isActive == true) return START_NOT_STICKY
        running = true
        store.watchStatus("active", "Watching for new arrivals")
        // Only held for this explicit, visible session. No reboot receiver or unattended restart.
        wakeLock = getSystemService(PowerManager::class.java).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "AyoubGallery:FolderWatch").apply {
            setReferenceCounted(false)
            acquire(10 * 60_000L)
        }
        work = scope.launch {
            try {
                if (getSystemService(JobScheduler::class.java).getPendingJob(UploadJobService.JOB_ID) == null) store.recover()
                while (isActive && store.watch()?.status == "active") {
                    wakeLock?.acquire(10 * 60_000L)
                    val session = store.watch() ?: break
                    val files = WatchFiles.list(this@FolderWatchService, session.folder)
                    val entries = store.watchEntries()
                    for (file in files) {
                        ensureActive()
                        if (store.watch()?.status != "active") break
                        val entry = WatchRules.observe(entries[file.path], file, System.currentTimeMillis())
                        if (entry != entries[file.path]) store.saveWatchEntry(entry)
                        if (!WatchRules.ready(entry, System.currentTimeMillis())) continue
                        try {
                            val photo = WatchFiles.read(this@FolderWatchService, file)
                            ensureActive()
                            if (photo.taken < session.since) store.saveWatchEntry(entry.copy(state = "filtered"))
                            else store.enqueueArrival(entry, photo)
                        } catch (error: CancellationException) { throw error }
                        catch (_: Exception) {
                            val attempts = entry.failures + 1
                            store.saveWatchEntry(entry.copy(failures = attempts, state = if (attempts >= 12) "failed" else "waiting"))
                        }
                    }
                    ensureActive()
                    if (store.watch()?.status != "active") break
                    val failures = store.watchEntries().values.filter { it.state == "failed" }
                    val message = if (failures.isEmpty()) "Watching ${store.batch()?.third.orEmpty()} • New arrivals only"
                        else "${failures.size} files need attention: ${failures.take(3).joinToString { it.file.name }}. Check they are complete JPEGs under 20 MB, then retry."
                    store.reportWatch("active", message)
                    getSystemService(NotificationManager::class.java).notify(8, notification(message))
                    UploadJobService.scheduleAutomatic(this@FolderWatchService)
                    delay(WatchRules.POLL_MS)
                }
            } catch (_: CancellationException) { }
            catch (error: Exception) {
                store.reportWatch("attention", "Watching paused: ${error.message ?: "Folder unavailable"}. Restore access to the same folder, then resume.")
            } finally { stopSelf() }
        }
        return START_NOT_STICKY
    }
    override fun onDestroy() {
        running = false
        scope.cancel()
        wakeLock?.let { if (it.isHeld) it.release() }
        // A saved active session is resumable after process death. It is never replaced with a new baseline.
        super.onDestroy()
    }
    companion object {
        private const val STOP = "xyz.ayoubabed.gallery.STOP_WATCHING"
        @Volatile var running = false
            private set
        fun start(context: Context) { context.startForegroundService(Intent(context, FolderWatchService::class.java)) }
        fun stop(context: Context) {
            Store(context).use { it.watchStatus("stopped", "Watching stopped. Queued uploads can finish.") }
            UploadJobService.scheduleAutomatic(context)
            context.stopService(Intent(context, FolderWatchService::class.java))
        }
    }
}
