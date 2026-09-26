package xyz.ayoubabed.gallery

import android.net.NetworkCapabilities
import android.net.NetworkRequest
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class UploadJobTest {
    @get:Rule val compose = createAndroidComposeRule<MainActivity>()

    @Test fun vpnIsEligibleAndWifiPreferenceStillApplies() {
        // Reproduce the old constraint using Android's real implementation.
        val old = NetworkRequest.Builder().addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET).build()
        assertTrue(old.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_VPN))
        val any = UploadJobService.networkRequest(false)
        assertFalse(any.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_VPN))
        assertTrue(any.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET))
        assertTrue(any.transportTypes.isEmpty())
        val wifi = UploadJobService.networkRequest(true)
        assertFalse(wifi.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_VPN))
        assertTrue(wifi.hasTransport(NetworkCapabilities.TRANSPORT_WIFI))
        assertTrue(wifi.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED))
    }

    @Test fun batchCanResumeBetweenPhotos() {
        val info = UploadJobService.jobInfo(compose.activity, false, List(400) { 5_000_000L })
        assertEquals(2_000_000_000L, info.estimatedNetworkUploadBytes)
        assertEquals(5_000_000L, info.minimumNetworkChunkBytes)
        assertTrue(info.isUserInitiated)
    }

    @Test fun automaticArrivalsUseBackgroundEligibleNetworkConstrainedJobs() {
        val info = UploadJobService.jobInfo(compose.activity, true, listOf(1_000L, 2_000L), userInitiated = false)
        assertFalse(info.isUserInitiated)
        assertEquals(3_000L, info.estimatedNetworkUploadBytes)
        assertEquals(2_000L, info.minimumNetworkChunkBytes)
        assertTrue(info.requiredNetwork!!.hasTransport(NetworkCapabilities.TRANSPORT_WIFI))
        assertTrue(info.requiredNetwork!!.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED))
        assertFalse(info.requiredNetwork!!.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_VPN))
    }

    @Test fun visibleUserTransferActuallyStarts() {
        val store = Store(compose.activity)
        try {
            compose.runOnIdle {
                store.replaceBatch("https://example.com", Gallery("test", "Test", "", "hidden"),
                    listOf(Photo("content://test/photo", "test.jpg", 1000, "a".repeat(64), 0, false)))
                assertTrue(UploadJobService.schedule(compose.activity, false))
            }
            // No token is installed: this proves JobService started without a server request.
            compose.waitUntil(timeoutMillis = 20_000) {
                store.prefs.getString("message", "") == "Reconnect this website in Settings, then resume."
            }
        } finally {
            UploadJobService.pause(compose.activity)
            store.clearQueue()
            store.message("No uploads yet.")
        }
    }

    @Test fun backgroundArrivalActuallyStartsAndHonorsPause() {
        Store(compose.activity).use { store ->
            val paused = store.prefs.getBoolean("uploads_paused", false)
            try {
                store.startWatch("https://example.com", Gallery("test", "Test", "", "hidden"), "content://test/tree/root", 0, emptyList())
                val file = WatchedFile("/new.jpg", "content://test/new", "new.jpg", 1000, 1)
                store.enqueueArrival(WatchEntry(file, "waiting", 0), Photo(file.uri, file.name, file.size, "b".repeat(64), 1, true))
                store.prefs.edit().putBoolean("uploads_paused", true).commit()
                UploadJobService.scheduleAutomatic(compose.activity)
                assertNull(compose.activity.getSystemService(android.app.job.JobScheduler::class.java).getPendingJob(UploadJobService.JOB_ID))
                compose.runOnIdle { compose.activity.moveTaskToBack(true) }
                store.prefs.edit().putBoolean("uploads_paused", false).commit()
                store.message("Waiting for automatic job")
                UploadJobService.scheduleAutomatic(compose.activity)
                // No token: reaching this message proves the background job ran, without a network request.
                compose.waitUntil(timeoutMillis = 30_000) {
                    store.prefs.getString("message", "") == "Reconnect this website in Settings, then resume."
                }
            } finally {
                UploadJobService.pause(compose.activity)
                store.watchStatus("stopped", "Stopped")
                store.clearQueue()
                store.prefs.edit().putBoolean("uploads_paused", paused).commit()
            }
        }
    }
}
