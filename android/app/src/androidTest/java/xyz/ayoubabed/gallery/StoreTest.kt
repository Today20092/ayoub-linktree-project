package xyz.ayoubabed.gallery

import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.*
import org.junit.Test

class StoreTest {
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
