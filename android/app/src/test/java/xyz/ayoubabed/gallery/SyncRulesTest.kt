package xyz.ayoubabed.gallery

import org.junit.Assert.*
import org.junit.Test
import java.time.ZoneId

class SyncRulesTest {
    @Test fun requiresHttpsOriginWithoutCredentialsOrPath() {
        assertEquals("https://example.com", SyncRules.site("https://example.com/"))
        listOf("http://example.com", "https://user:pass@example.com", "https://example.com/path", "https://example.com?token=x", "file:///tmp/a").forEach {
            assertTrue(runCatching { SyncRules.site(it) }.isFailure)
        }
    }
    @Test fun exifOffsetWinsOverPhoneTimezone() {
        val utc = SyncRules.captureTime("2026:09:26 10:00:00", "+00:00", 1L, ZoneId.of("America/New_York"))
        val local = SyncRules.captureTime("2026:09:26 10:00:00", null, 1L, ZoneId.of("America/New_York"))
        assertEquals(4*60*60*1000L, local.first-utc.first)
        assertFalse(utc.second)
    }
    @Test fun malformedExifIsExplicitFallback() {
        assertEquals(123L to true, SyncRules.captureTime("invalid", null, 123L))
        assertEquals(123L to true, SyncRules.captureTime(null, null, 123L))
    }
    @Test fun contentIdentityIgnoresFilename() {
        assertEquals("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad", SyncRules.sha256("abc".toByteArray()))
        assertTrue(SyncRules.jpeg("P100.JPG"))
        assertFalse(SyncRules.jpeg("P100.RW2"))
    }
    @Test fun authAndBadPhotosAreNotRetriedBlindly() {
        assertFalse(SyncRules.retryable(401)); assertFalse(SyncRules.retryable(400))
        assertTrue(SyncRules.retryable(409)); assertTrue(SyncRules.retryable(503))
    }
}
