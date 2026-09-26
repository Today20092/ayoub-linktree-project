package xyz.ayoubabed.gallery

import org.junit.Assert.*
import org.junit.Test

class WatchRulesTest {
    private val file = WatchedFile("/day/photo.jpg", "content://photos/1", "photo.jpg", 100, 10)

    @Test fun initialFilesStayExcludedEvenWhenReplaced() {
        val baseline = WatchEntry(file, "baseline", 0)
        assertEquals(baseline, WatchRules.observe(baseline, file.copy(uri = "content://photos/2", size = 200), 20_000))
        assertFalse(WatchRules.ready(baseline, 20_000))
    }
    @Test fun arrivalsWaitForStableMetadata() {
        val arrival = WatchRules.observe(null, file, 1_000)
        assertFalse(WatchRules.ready(arrival, 5_999))
        assertTrue(WatchRules.ready(WatchRules.observe(arrival, file, 6_000), 6_000))
        val growing = WatchRules.observe(arrival, file.copy(size = 200), 6_000)
        assertFalse(WatchRules.ready(growing, 6_000))
        assertTrue(WatchRules.ready(growing, 11_000))
    }
    @Test fun zeroBytePlaceholderIsNeverReady() {
        assertFalse(WatchRules.ready(WatchRules.observe(null, file.copy(size = 0), 0), 60_000))
    }
    @Test fun queuedAndFilteredPathsDoNotUploadEditedVersions() {
        for (state in listOf("queued", "filtered")) {
            val previous = WatchEntry(file, state, 0)
            assertEquals(previous, WatchRules.observe(previous, file.copy(modified = 99), 60_000))
        }
    }
    @Test fun failedFileRetriesOnlyAfterChangeOrExplicitReset() {
        val failed = WatchEntry(file, "failed", 0, 12)
        assertEquals(failed, WatchRules.observe(failed, file, 60_000))
        assertFalse(WatchRules.ready(failed, 60_000))
        assertEquals("waiting", WatchRules.observe(failed, file.copy(modified = 99), 60_000).state)
    }
    @Test fun clockMovingBackwardsRestartsSettling() {
        val previous = WatchEntry(file, "waiting", 20_000)
        val reset = WatchRules.observe(previous, file, 10_000)
        assertEquals(10_000L, reset.stableSince)
        assertFalse(WatchRules.ready(reset, 10_000))
    }
    @Test fun resumedSessionRecognizesMissedArrivalsWithoutChangingBaseline() {
        val old = WatchEntry(file, "baseline", 0)
        val arrivedWhileStopped = file.copy(path = "/day/new.jpg", uri = "content://photos/2")
        assertEquals(old, WatchRules.observe(old, file, 30_000))
        assertEquals("waiting", WatchRules.observe(null, arrivedWhileStopped, 30_000).state)
    }
}
