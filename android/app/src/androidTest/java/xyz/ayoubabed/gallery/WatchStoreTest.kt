package xyz.ayoubabed.gallery

import android.database.sqlite.SQLiteDatabase
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.*
import org.junit.Test

class WatchStoreTest {
    private val context get() = InstrumentationRegistry.getInstrumentation().targetContext
    private val gallery = Gallery("test", "Test gallery", "Photos", "hidden")
    private val file = WatchedFile("/day/photo.jpg", "content://test/1", "photo.jpg", 100, 10)
    private val photo = Photo(file.uri, file.name, file.size, "a".repeat(64), 10, true)

    @Test fun resumeKeepsBaselineAndStopDoesNotCancelQueuedArrivals() {
        val name = "watch-persistence-test.db"
        context.deleteDatabase(name)
        try {
            Store(context, name).use {
                it.startWatch("https://example.com", gallery, "content://test/tree/root", 7, listOf(file))
            }
            Store(context, name).use {
                assertEquals("baseline", it.watchEntries()[file.path]?.state)
                assertEquals(7L, it.watch()?.since)
                assertEquals("active", it.watch()?.status)
                val arrival = file.copy(path = "/day/new.jpg", uri = "content://test/2")
                it.enqueueArrival(WatchEntry(arrival, "waiting", 0), photo.copy(uri = arrival.uri))
                assertEquals("queued", it.items().single().state)
                assertEquals(arrival.path, it.items().single().watchPath)
                assertTrue(runCatching { it.clearQueue() }.isFailure)
                assertTrue(runCatching { it.replaceBatch("https://other.example", gallery, emptyList()) }.isFailure)
                assertTrue(runCatching { it.saveConnection("https://other.example", "key") }.isFailure)
                it.watchStatus("stopped", "Stopped")
                it.reportWatch("active", "Late scan must not restart watching")
                assertEquals("stopped", it.watch()?.status)
                it.enqueueArrival(WatchEntry(arrival.copy(path = "/late.jpg"), "waiting", 0), photo.copy(hash = "b".repeat(64)))
                assertEquals(1, it.items().size)
                assertEquals("queued", it.items().single().state)
                assertTrue(runCatching { it.startWatch("https://example.com", gallery, "other", 0, emptyList()) }.isFailure)
                it.clearQueue()
                it.startWatch("https://example.com", gallery, "new-folder", 0, listOf(file, arrival))
                assertEquals(2, it.watchEntries().values.count { entry -> entry.state == "baseline" })
                assertTrue(it.items().isEmpty())
            }
        } finally { context.deleteDatabase(name) }
    }

    @Test fun duplicateContentIsQueuedOnceAndEachPathIsRemembered() {
        val name = "watch-duplicates-test.db"
        context.deleteDatabase(name)
        try { Store(context, name).use {
            it.startWatch("https://example.com", gallery, "folder", 0, emptyList())
            it.enqueueArrival(WatchEntry(file, "waiting", 0), photo)
            val renamed = file.copy(path = "/copy.jpg", uri = "content://test/2")
            it.enqueueArrival(WatchEntry(renamed, "waiting", 0), photo.copy(uri = renamed.uri))
            assertEquals(1, it.items().size)
            assertEquals(2, it.watchEntries().values.count { entry -> entry.state == "queued" })
        } } finally { context.deleteDatabase(name) }
    }

    @Test fun versionOneMigrationPreservesExistingBatchAndQueue() {
        val name = "watch-migration-test.db"
        context.deleteDatabase(name)
        try {
            SQLiteDatabase.openOrCreateDatabase(context.getDatabasePath(name), null).use {
                it.execSQL("CREATE TABLE queue (id INTEGER PRIMARY KEY AUTOINCREMENT, uri TEXT NOT NULL, name TEXT NOT NULL, size INTEGER NOT NULL, hash TEXT NOT NULL UNIQUE, state TEXT NOT NULL DEFAULT 'queued', error TEXT NOT NULL DEFAULT '', attempts INTEGER NOT NULL DEFAULT 0)")
                it.execSQL("CREATE TABLE batch (id INTEGER PRIMARY KEY CHECK (id=1), site TEXT NOT NULL, gallery TEXT NOT NULL, title TEXT NOT NULL)")
                it.execSQL("INSERT INTO batch VALUES(1,'https://example.com','test','Saved gallery')")
                it.execSQL("INSERT INTO queue(uri,name,size,hash,state) VALUES('content://test/1','saved.jpg',123,'hash','uploading')")
                it.version = 1
            }
            Store(context, name).use {
                assertEquals("Saved gallery", it.batch()?.third)
                assertEquals("saved.jpg", it.items().single().name)
                assertEquals("", it.items().single().watchPath)
                assertNull(it.watch())
                it.recover()
                assertEquals("queued", it.items().single().state)
                assertEquals(2, it.readableDatabase.version)
            }
        } finally { context.deleteDatabase(name) }
    }
}
