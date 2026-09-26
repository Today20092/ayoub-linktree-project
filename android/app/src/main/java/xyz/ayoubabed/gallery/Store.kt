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
data class QueueItem(val id: Long, val uri: String, val name: String, val size: Long, val hash: String, val state: String, val error: String, val attempts: Int)
data class Gallery(val id: String, val title: String, val category: String, val status: String)

class Store(context: Context) : SQLiteOpenHelper(context.applicationContext, "uploads.db", null, 1) {
    val prefs = context.getSharedPreferences("gallery", Context.MODE_PRIVATE)
    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL("CREATE TABLE queue (id INTEGER PRIMARY KEY AUTOINCREMENT, uri TEXT NOT NULL, name TEXT NOT NULL, size INTEGER NOT NULL, hash TEXT NOT NULL UNIQUE, state TEXT NOT NULL DEFAULT 'queued', error TEXT NOT NULL DEFAULT '', attempts INTEGER NOT NULL DEFAULT 0)")
        db.execSQL("CREATE TABLE batch (id INTEGER PRIMARY KEY CHECK (id=1), site TEXT NOT NULL, gallery TEXT NOT NULL, title TEXT NOT NULL)")
    }
    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) = Unit
    fun batch(): Triple<String, String, String>? = readableDatabase.rawQuery("SELECT site,gallery,title FROM batch WHERE id=1", null).use { if (it.moveToFirst()) Triple(it.getString(0), it.getString(1), it.getString(2)) else null }
    fun replaceBatch(site: String, gallery: Gallery, photos: List<Photo>) {
        val db = writableDatabase
        db.beginTransaction()
        try {
            db.delete("queue", null, null); db.delete("batch", null, null)
            db.execSQL("INSERT INTO batch VALUES (1,?,?,?)", arrayOf(site, gallery.id, gallery.title))
            photos.forEach { photo -> db.insertWithOnConflict("queue", null, ContentValues().apply {
                put("uri", photo.uri); put("name", photo.name); put("size", photo.size); put("hash", photo.hash)
            }, SQLiteDatabase.CONFLICT_IGNORE) }
            db.setTransactionSuccessful()
        } finally { db.endTransaction() }
    }
    fun items(): List<QueueItem> = readableDatabase.rawQuery("SELECT id,uri,name,size,hash,state,error,attempts FROM queue ORDER BY id", null).use { c ->
        buildList { while(c.moveToNext()) add(QueueItem(c.getLong(0), c.getString(1), c.getString(2), c.getLong(3), c.getString(4), c.getString(5), c.getString(6), c.getInt(7))) }
    }
    fun state(id: Long, state: String, error: String = "", attempts: Int? = null) {
        writableDatabase.update("queue", ContentValues().apply { put("state", state); put("error", error); if(attempts != null) put("attempts", attempts) }, "id=?", arrayOf(id.toString()))
    }
    fun recover() { writableDatabase.execSQL("UPDATE queue SET state='queued' WHERE state='uploading'") }
    fun retry() { writableDatabase.execSQL("UPDATE queue SET state='queued', error='', attempts=0 WHERE state IN ('failed','uploading')") }
    fun clearQueue() { writableDatabase.delete("queue", null, null); writableDatabase.delete("batch", null, null) }
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
