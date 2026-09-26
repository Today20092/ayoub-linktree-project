package xyz.ayoubabed.gallery

import android.content.Context
import android.content.ContentValues
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import org.json.JSONObject
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

data class Photo(val uri: String, val name: String, val size: Long, val hash: String, val taken: Long, val fallback: Boolean)
data class QueueItem(val id: Long, val uri: String, val name: String, val size: Long, val hash: String, val state: String, val error: String, val attempts: Int, val watchPath: String = "")
data class Gallery(val id: String, val title: String, val category: String, val status: String)

class Store(context: Context, databaseName: String = "uploads.db") : SQLiteOpenHelper(context.applicationContext, databaseName, null, 2) {
    val prefs = context.getSharedPreferences("gallery", Context.MODE_PRIVATE)
    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL("CREATE TABLE queue (id INTEGER PRIMARY KEY AUTOINCREMENT, uri TEXT NOT NULL, name TEXT NOT NULL, size INTEGER NOT NULL, hash TEXT NOT NULL UNIQUE, state TEXT NOT NULL DEFAULT 'queued', error TEXT NOT NULL DEFAULT '', attempts INTEGER NOT NULL DEFAULT 0, watch_path TEXT NOT NULL DEFAULT '')")
        db.execSQL("CREATE TABLE batch (id INTEGER PRIMARY KEY CHECK (id=1), site TEXT NOT NULL, gallery TEXT NOT NULL, title TEXT NOT NULL)")
        createWatchTables(db)
    }
    private fun createWatchTables(db: SQLiteDatabase) {
        db.execSQL("CREATE TABLE watch_session (id INTEGER PRIMARY KEY CHECK(id=1), folder TEXT NOT NULL, since INTEGER NOT NULL, status TEXT NOT NULL, message TEXT NOT NULL DEFAULT '')")
        db.execSQL("CREATE TABLE watch_files (path TEXT PRIMARY KEY, uri TEXT NOT NULL, name TEXT NOT NULL, size INTEGER NOT NULL, modified INTEGER NOT NULL, state TEXT NOT NULL, stable_since INTEGER NOT NULL, failures INTEGER NOT NULL DEFAULT 0)")
    }
    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        if (oldVersion < 2) {
            db.execSQL("ALTER TABLE queue ADD COLUMN watch_path TEXT NOT NULL DEFAULT ''")
            createWatchTables(db)
        }
    }
    fun batch(): Triple<String, String, String>? = readableDatabase.rawQuery("SELECT site,gallery,title FROM batch WHERE id=1", null).use { if (it.moveToFirst()) Triple(it.getString(0), it.getString(1), it.getString(2)) else null }
    fun replaceBatch(site: String, gallery: Gallery, photos: List<Photo>) {
        check(!watchLocked()) { "Stop watching before replacing the batch." }
        val db = writableDatabase
        db.beginTransaction()
        try {
            db.delete("queue", null, null); db.delete("batch", null, null)
            db.delete("watch_session", null, null); db.delete("watch_files", null, null)
            db.execSQL("INSERT INTO batch VALUES (1,?,?,?)", arrayOf(site, gallery.id, gallery.title))
            photos.forEach { photo -> db.insertWithOnConflict("queue", null, ContentValues().apply {
                put("uri", photo.uri); put("name", photo.name); put("size", photo.size); put("hash", photo.hash)
            }, SQLiteDatabase.CONFLICT_IGNORE) }
            db.setTransactionSuccessful()
        } finally { db.endTransaction() }
    }
    fun items(): List<QueueItem> = readableDatabase.rawQuery("SELECT id,uri,name,size,hash,state,error,attempts,watch_path FROM queue ORDER BY id", null).use { c ->
        buildList { while(c.moveToNext()) add(QueueItem(c.getLong(0), c.getString(1), c.getString(2), c.getLong(3), c.getString(4), c.getString(5), c.getString(6), c.getInt(7), c.getString(8))) }
    }
    fun state(id: Long, state: String, error: String = "", attempts: Int? = null) {
        writableDatabase.update("queue", ContentValues().apply { put("state", state); put("error", error); if(attempts != null) put("attempts", attempts) }, "id=?", arrayOf(id.toString()))
    }
    fun recover() { writableDatabase.execSQL("UPDATE queue SET state='queued' WHERE state='uploading'") }
    fun retry() { writableDatabase.execSQL("UPDATE queue SET state='queued', error='', attempts=0 WHERE state IN ('failed','uploading')") }
    fun clearQueue() {
        check(!watchLocked()) { "Stop watching before clearing the batch." }
        writableDatabase.beginTransaction()
        try {
            writableDatabase.delete("queue", null, null); writableDatabase.delete("batch", null, null)
            writableDatabase.delete("watch_session", null, null); writableDatabase.delete("watch_files", null, null)
            writableDatabase.setTransactionSuccessful()
        } finally { writableDatabase.endTransaction() }
    }
    fun watch(): WatchSession? = readableDatabase.rawQuery("SELECT folder,since,status,message FROM watch_session WHERE id=1", null).use {
        if (it.moveToFirst()) WatchSession(it.getString(0), it.getLong(1), it.getString(2), it.getString(3)) else null
    }
    fun watchLocked() = watch()?.status in listOf("active", "attention")
    fun watchStatus(status: String, message: String) {
        writableDatabase.update("watch_session", ContentValues().apply { put("status", status); put("message", message) }, "id=1", null)
    }
    fun reportWatch(status: String, message: String) {
        writableDatabase.update("watch_session", ContentValues().apply { put("status", status); put("message", message) }, "id=1 AND status='active'", null)
    }
    fun startWatch(site: String, gallery: Gallery, folder: String, since: Long, baseline: List<WatchedFile>) {
        check(!watchLocked() && !hasPending()) { "Stop watching and finish or clear the previous batch first." }
        val db = writableDatabase
        db.beginTransaction()
        try {
            replaceBatch(site, gallery, emptyList())
            db.execSQL("INSERT INTO watch_session(id,folder,since,status) VALUES(1,?,?,'active')", arrayOf<Any>(folder, since))
            baseline.forEach { saveWatchEntry(WatchEntry(it, "baseline", 0)) }
            db.setTransactionSuccessful()
        } finally { db.endTransaction() }
        prefs.edit().putBoolean("uploads_paused", false).commit()
    }
    fun watchEntries(): Map<String, WatchEntry> = readableDatabase.rawQuery("SELECT path,uri,name,size,modified,state,stable_since,failures FROM watch_files", null).use { c ->
        buildMap { while(c.moveToNext()) {
            val file = WatchedFile(c.getString(0), c.getString(1), c.getString(2), c.getLong(3), c.getLong(4))
            put(file.path, WatchEntry(file, c.getString(5), c.getLong(6), c.getInt(7)))
        } }
    }
    fun saveWatchEntry(entry: WatchEntry) {
        writableDatabase.insertWithOnConflict("watch_files", null, ContentValues().apply {
            put("path", entry.file.path); put("uri", entry.file.uri); put("name", entry.file.name)
            put("size", entry.file.size); put("modified", entry.file.modified); put("state", entry.state)
            put("stable_since", entry.stableSince); put("failures", entry.failures)
        }, SQLiteDatabase.CONFLICT_REPLACE)
    }
    fun enqueueArrival(entry: WatchEntry, photo: Photo) {
        val db = writableDatabase
        db.beginTransaction()
        try {
            if (watch()?.status != "active") return
            db.insertWithOnConflict("queue", null, ContentValues().apply {
                put("uri", photo.uri); put("name", photo.name); put("size", photo.size); put("hash", photo.hash); put("watch_path", entry.file.path)
            }, SQLiteDatabase.CONFLICT_IGNORE)
            saveWatchEntry(entry.copy(state = "queued"))
            db.setTransactionSuccessful()
        } finally { db.endTransaction() }
    }
    fun refreshWatchedPhoto(item: QueueItem, photo: Photo): QueueItem? {
        val duplicate = items().any { it.id != item.id && it.hash == photo.hash }
        if (duplicate) { state(item.id, "skipped"); return null }
        writableDatabase.update("queue", ContentValues().apply { put("hash", photo.hash); put("size", photo.size) }, "id=?", arrayOf(item.id.toString()))
        return item.copy(hash = photo.hash, size = photo.size)
    }
    fun hasPending() = items().any { it.state in listOf("queued", "uploading", "failed") }
    fun message(value: String) { prefs.edit().putString("message", value).apply() }
    fun saveSource(gallery: String, folder: String, since: Long) { prefs.edit().putString("source_$gallery", JSONObject().put("folder", folder).put("since", since).toString()).apply() }
    fun source(gallery: String): Pair<String, Long> {
        val obj = JSONObject(prefs.getString("source_$gallery", "{}")!!)
        return obj.optString("folder") to obj.optLong("since", 0)
    }
    private fun key(): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        return (store.getKey("gallery-device", null) as? SecretKey) ?: KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").apply {
            init(KeyGenParameterSpec.Builder("gallery-device", KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build())
        }.generateKey()
    }
    fun saveConnection(site: String, token: String) {
        require(!watchLocked() || batch()?.first == site) { "Stop watching before changing websites." }
        require(!hasPending() || batch()?.first == site) {
            "Finish or clear the current upload batch before changing websites."
        }
        val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply { init(Cipher.ENCRYPT_MODE, key()) }
        val data = cipher.doFinal(token.toByteArray())
        prefs.edit().putString("site", site).putString("token", Base64.encodeToString(cipher.iv + data, Base64.NO_WRAP)).commit()
    }
    fun token(): String {
        val encoded = prefs.getString("token", null) ?: return ""
        return try {
            val data = Base64.decode(encoded, Base64.NO_WRAP)
            val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply { init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, data.copyOfRange(0,12))) }
            String(cipher.doFinal(data.copyOfRange(12,data.size)))
        } catch (_: Exception) { "" }
    }
}
