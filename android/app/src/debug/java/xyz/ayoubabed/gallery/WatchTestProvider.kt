package xyz.ayoubabed.gallery

import android.database.Cursor
import android.database.MatrixCursor
import android.os.Bundle
import android.os.CancellationSignal
import android.os.ParcelFileDescriptor
import android.provider.DocumentsContract
import android.provider.DocumentsProvider
import java.io.File

/** Debug builds only. Exercises real SAF queries and revocation without a camera app or server. */
class WatchTestProvider : DocumentsProvider() {
    private val docColumns = arrayOf("document_id", "_display_name", "mime_type", "_size", "last_modified", "flags")
    private var denied = false
    private val root get() = File(requireNotNull(context).cacheDir, "watched-provider").apply { mkdirs() }
    override fun onCreate() = true
    override fun queryRoots(projection: Array<out String>?): Cursor = MatrixCursor(projection ?: arrayOf("root_id", "document_id", "title", "flags")).apply {
        addRow(columnNames.map { when(it) { "root_id", "document_id" -> "root"; "title" -> "Watch test"; else -> 0 } })
    }
    private fun file(id: String) = if (id == "root") root else File(root, id.removePrefix("root/"))
    private fun row(cursor: MatrixCursor, id: String) {
        val f = file(id)
        if (!f.exists()) return
        cursor.addRow(cursor.columnNames.map { when(it) {
            "document_id" -> id
            "_display_name" -> f.name
            "mime_type" -> if (f.isDirectory) DocumentsContract.Document.MIME_TYPE_DIR else "image/jpeg"
            "_size" -> f.length()
            "last_modified" -> f.lastModified()
            else -> 0
        } })
    }
    override fun queryDocument(documentId: String, projection: Array<out String>?): Cursor {
        if (denied) throw SecurityException("Folder permission revoked")
        return MatrixCursor(projection ?: docColumns).apply { row(this, documentId) }
    }
    override fun queryChildDocuments(parentDocumentId: String, projection: Array<out String>?, sortOrder: String?): Cursor {
        if (denied) throw SecurityException("Folder permission revoked")
        return MatrixCursor(projection ?: docColumns).apply {
            file(parentDocumentId).listFiles().orEmpty().forEach { row(this, "$parentDocumentId/${it.name}") }
        }
    }
    override fun isChildDocument(parentDocumentId: String, documentId: String) = documentId.startsWith("$parentDocumentId/")
    override fun openDocument(documentId: String, mode: String, signal: CancellationSignal?): ParcelFileDescriptor {
        if (denied) throw SecurityException("Folder permission revoked")
        return ParcelFileDescriptor.open(file(documentId), ParcelFileDescriptor.MODE_READ_ONLY)
    }
    override fun call(method: String, arg: String?, extras: Bundle?): Bundle? {
        when(method) {
            "reset" -> { root.deleteRecursively(); denied = false }
            "deny" -> denied = extras?.getBoolean("value") ?: true
            "write" -> {
                val target = file(requireNotNull(arg))
                target.parentFile?.mkdirs()
                target.writeBytes(requireNotNull(extras?.getByteArray("bytes")))
                target.setLastModified(extras.getLong("modified", System.currentTimeMillis()))
            }
            else -> return super.call(method, arg, extras)
        }
        return Bundle.EMPTY
    }
}
