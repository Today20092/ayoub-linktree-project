package xyz.ayoubabed.gallery

import android.graphics.Bitmap
import android.net.Uri
import android.os.Bundle
import android.os.PowerManager
import android.content.Intent
import android.provider.DocumentsContract
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.platform.app.InstrumentationRegistry
import kotlinx.coroutines.runBlocking
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test
import java.io.ByteArrayOutputStream

class FolderWatchTest {
    @get:Rule val compose = createAndroidComposeRule<MainActivity>()
    private val authority = "xyz.ayoubabed.gallery.test.documents"
    private val tree get() = DocumentsContract.buildTreeDocumentUri(authority, "root").toString()
    private fun call(method: String, path: String? = null, extras: Bundle? = null) {
        compose.activity.contentResolver.call(Uri.parse("content://$authority"), method, path, extras)
    }
    private fun jpeg(color: Int): ByteArray = ByteArrayOutputStream().use { output ->
        Bitmap.createBitmap(4, 4, Bitmap.Config.ARGB_8888).apply { eraseColor(color); compress(Bitmap.CompressFormat.JPEG, 90, output); recycle() }
        output.toByteArray()
    }
    private fun write(path: String, bytes: ByteArray, modified: Long = System.currentTimeMillis()) = call("write", "root/$path", Bundle().apply {
        putByteArray("bytes", bytes); putLong("modified", modified)
    })
    private fun shell(command: String) {
        android.os.ParcelFileDescriptor.AutoCloseInputStream(InstrumentationRegistry.getInstrumentation().uiAutomation.executeShellCommand(command)).use { it.readBytes() }
    }
    private fun wakeScreen() { shell("input keyevent KEYCODE_WAKEUP"); shell("wm dismiss-keyguard") }

    @Test fun detectsCompletedArrivalsAndRecoversOriginalSessionAfterAccessLoss() = runBlocking {
        val store = Store(compose.activity)
        val savedPaused = store.prefs.getBoolean("uploads_paused", false)
        try {
            call("reset")
            write("existing.jpg", jpeg(android.graphics.Color.RED))
            val baseline = WatchFiles.list(compose.activity, tree)
            store.startWatch("https://example.com", Gallery("watch-test", "Watch test", "Photos", "hidden"), tree, 1_000, baseline)
            // No network requests in this test. Discovery must keep working while uploads are paused.
            store.prefs.edit().putBoolean("uploads_paused", true).commit()
            compose.runOnIdle { FolderWatchService.start(compose.activity) }
            compose.waitUntil(10_000) { FolderWatchService.running }
            shell("input keyevent KEYCODE_SLEEP")
            compose.waitUntil(5_000) { !compose.activity.getSystemService(PowerManager::class.java).isInteractive }
            val arrival = jpeg(android.graphics.Color.GREEN)
            write("new-day/new.jpg", arrival.copyOf(arrival.size - 2))
            write("old-date.jpg", jpeg(android.graphics.Color.BLUE), modified = 1)
            compose.waitUntil(20_000) { store.watchEntries().containsKey("/new-day/new.jpg") && store.watchEntries()["/old-date.jpg"]?.state == "filtered" }
            assertTrue(store.items().isEmpty())
            write("new-day/new.jpg", arrival)
            compose.waitUntil(25_000) { store.items().size == 1 }
            assertEquals("new.jpg", store.items().single().name)
            assertEquals("queued", store.items().single().state)
            wakeScreen()
            // Replacing an already queued path must not enqueue another version.
            write("new-day/new.jpg", jpeg(android.graphics.Color.YELLOW))
            call("deny")
            compose.waitUntil(15_000) { store.watch()?.status == "attention" && !FolderWatchService.running }
            assertEquals(1, store.items().size)
            call("deny", extras = Bundle().apply { putBoolean("value", false) })
            write("missed.jpg", jpeg(android.graphics.Color.CYAN))
            compose.runOnIdle { FolderWatchService.start(compose.activity) }
            compose.waitUntil(25_000) { store.items().size == 2 }
            assertEquals("baseline", store.watchEntries()["/existing.jpg"]?.state)
            compose.runOnIdle { FolderWatchService.stop(compose.activity) }
            compose.waitUntil(10_000) { !FolderWatchService.running }
            assertEquals("stopped", store.watch()?.status)
            assertEquals(2, store.items().count { it.state == "queued" })
        } finally {
            wakeScreen()
            compose.runOnIdle { FolderWatchService.stop(compose.activity) }
            UploadJobService.pause(compose.activity)
            store.clearQueue()
            store.prefs.edit().putBoolean("uploads_paused", savedPaused).commit()
            call("reset")
            store.close()
        }
    }

    @Test fun resumeRecoversAnInterruptedUploadWithoutReplacingTheBaseline() = runBlocking {
        val store = Store(compose.activity)
        val paused = store.prefs.getBoolean("uploads_paused", false)
        try {
            call("reset")
            write("existing.jpg", jpeg(android.graphics.Color.RED))
            val baseline = WatchFiles.list(compose.activity, tree)
            store.startWatch("https://example.com", Gallery("watch-test", "Watch test", "Photos", "hidden"), tree, 0, baseline)
            store.prefs.edit().putBoolean("uploads_paused", true).commit()
            compose.runOnIdle { FolderWatchService.start(compose.activity) }
            compose.waitUntil(10_000) { FolderWatchService.running }
            // Destroy only the runtime service, preserving the saved session like process loss.
            compose.runOnIdle { compose.activity.stopService(Intent(compose.activity, FolderWatchService::class.java)) }
            compose.waitUntil(10_000) { !FolderWatchService.running }
            write("interrupted.jpg", jpeg(android.graphics.Color.GREEN))
            val file = WatchFiles.list(compose.activity, tree).first { it.name == "interrupted.jpg" }
            store.enqueueArrival(WatchEntry(file, "waiting", 0), WatchFiles.read(compose.activity, file))
            store.state(store.items().single().id, "uploading")
            compose.runOnIdle { FolderWatchService.start(compose.activity) }
            compose.waitUntil(10_000) { store.items().single().state == "queued" }
            assertEquals("baseline", store.watchEntries()["/existing.jpg"]?.state)
            assertEquals("active", store.watch()?.status)
        } finally {
            compose.runOnIdle { FolderWatchService.stop(compose.activity) }
            UploadJobService.pause(compose.activity)
            store.clearQueue()
            store.prefs.edit().putBoolean("uploads_paused", paused).commit()
            call("reset")
            store.close()
        }
    }
}
