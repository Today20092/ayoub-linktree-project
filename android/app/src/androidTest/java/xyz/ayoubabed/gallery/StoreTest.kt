package xyz.ayoubabed.gallery

import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.*
import org.junit.Test

class StoreTest {
    @Test fun pendingBatchKeepsItsWebsiteAndCredentials() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val store = Store(context)
        val savedSite = store.prefs.getString("site", null)
        val savedToken = store.prefs.getString("token", null)
        try {
            store.clearQueue()
            store.saveConnection("https://preview.example.com", "preview-key")
            store.replaceBatch("https://preview.example.com", Gallery("test", "Test", "Photos", "hidden"),
                listOf(Photo("content://test/1", "test.jpg", 100, "a".repeat(64), 0, false)))
            assertTrue(runCatching { store.saveConnection(SyncRules.PRODUCTION_SITE, "production-key") }.isFailure)
            assertEquals("https://preview.example.com", store.prefs.getString("site", ""))
            assertEquals("preview-key", store.token())
            store.clearQueue()
            store.saveConnection(SyncRules.PRODUCTION_SITE, "production-key")
            assertEquals(SyncRules.PRODUCTION_SITE, store.prefs.getString("site", ""))
            assertEquals("production-key", store.token())
        } finally {
            store.clearQueue()
            store.prefs.edit().putString("site", savedSite).putString("token", savedToken).commit()
            store.close()
        }
    }

    @Test fun queueSurvivesReopenAndOldIdsCannotUpdateNewBatches() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val store = Store(context)
        store.clearQueue()
        val gallery = Gallery("test", "Test", "Photos", "published")
        val photo = Photo("content://test/1", "test.jpg", 100, "a".repeat(64), 0, false)
        store.replaceBatch("https://example.com", gallery, listOf(photo,photo))
        assertEquals(1,store.items().size)
        val oldId = store.items().single().id
        store.state(oldId,"uploading")
        store.close()
        val reopened = Store(context)
        reopened.recover()
        assertEquals("queued",reopened.items().single().state)
        reopened.clearQueue()
        reopened.replaceBatch("https://example.com", gallery, listOf(photo))
        assertNotEquals(oldId,reopened.items().single().id)
        reopened.state(oldId,"uploaded")
        assertEquals("queued",reopened.items().single().state)
        reopened.clearQueue()
        reopened.close()
    }
}
