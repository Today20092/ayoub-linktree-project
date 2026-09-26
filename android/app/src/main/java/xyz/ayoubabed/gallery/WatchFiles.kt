package xyz.ayoubabed.gallery

import android.content.Context
import android.net.Uri
import android.provider.DocumentsContract
import androidx.exifinterface.media.ExifInterface
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import java.security.MessageDigest

class IncompletePhoto : Exception("Photo is still being copied or changed. Waiting for a complete JPEG.")

object WatchFiles {
    // Query the provider directly: DocumentFile.listFiles() can silently turn access failures into an empty folder.
    suspend fun list(context: Context, folder: String): List<WatchedFile> {
        val tree = Uri.parse(folder)
        val resolver = context.contentResolver
        val result = mutableListOf<WatchedFile>()
        val columns = arrayOf(DocumentsContract.Document.COLUMN_DOCUMENT_ID, DocumentsContract.Document.COLUMN_DISPLAY_NAME,
            DocumentsContract.Document.COLUMN_MIME_TYPE, DocumentsContract.Document.COLUMN_SIZE, DocumentsContract.Document.COLUMN_LAST_MODIFIED)
        val visited = mutableSetOf<String>()
        suspend fun visit(id: String, parent: String) {
            currentCoroutineContext().ensureActive()
            check(visited.add(id)) { "Folder provider returned a directory cycle." }
            val children = DocumentsContract.buildChildDocumentsUriUsingTree(tree, id)
            resolver.query(children, columns, null, null, null)?.use { cursor ->
                check(!cursor.extras.getBoolean(DocumentsContract.EXTRA_LOADING, false)) { "Folder contents are still loading. Wait for the folder provider, then resume." }
                while (cursor.moveToNext()) {
                    currentCoroutineContext().ensureActive()
                    val child = cursor.getString(0)
                    val name = cursor.getString(1) ?: continue
                    val path = "$parent/${Uri.encode(name)}"
                    if (cursor.getString(2) == DocumentsContract.Document.MIME_TYPE_DIR) visit(child, path)
                    else if (SyncRules.jpeg(name)) result.add(WatchedFile(path, DocumentsContract.buildDocumentUriUsingTree(tree, child).toString(), name, cursor.getLong(3), cursor.getLong(4)))
                }
            } ?: error("Folder access was lost. Choose the same folder again, then resume watching.")
        }
        val root = DocumentsContract.buildDocumentUriUsingTree(tree, DocumentsContract.getTreeDocumentId(tree))
        resolver.query(root, arrayOf(DocumentsContract.Document.COLUMN_DOCUMENT_ID), null, null, null)?.use {
            check(it.moveToFirst()) { "Folder access was lost. Choose the same folder again, then resume watching." }
        } ?: error("Folder access was lost. Choose the same folder again, then resume watching.")
        visit(DocumentsContract.getTreeDocumentId(tree), "")
        return result
    }

    fun metadata(context: Context, file: WatchedFile): WatchedFile = context.contentResolver.query(Uri.parse(file.uri),
        arrayOf(DocumentsContract.Document.COLUMN_SIZE, DocumentsContract.Document.COLUMN_LAST_MODIFIED), null, null, null)?.use {
        check(it.moveToFirst()) { "Photo is no longer available." }
        file.copy(size = it.getLong(0), modified = it.getLong(1))
    } ?: error("Photo is no longer available.")

    suspend fun read(context: Context, file: WatchedFile): Photo {
        require(file.size <= SyncRules.MAX_BYTES) { "Photo is over 20 MB." }
        val digest = MessageDigest.getInstance("SHA-256")
        var size = 0L
        var first = -1; var second = -1; var previous = -1; var last = -1
        context.contentResolver.openInputStream(Uri.parse(file.uri))?.use { input ->
            val bytes = ByteArray(64 * 1024)
            while (true) {
                currentCoroutineContext().ensureActive()
                val count = input.read(bytes)
                if (count < 0) break
                if (count == 0) continue
                if (size == 0L) first = bytes[0].toInt() and 255
                if (size <= 1 && size + count > 1) second = bytes[(1 - size).toInt()].toInt() and 255
                previous = if (count > 1) bytes[count - 2].toInt() and 255 else last
                last = bytes[count - 1].toInt() and 255
                size += count
                require(size <= SyncRules.MAX_BYTES) { "Photo is over 20 MB." }
                digest.update(bytes, 0, count)
            }
        } ?: error("Could not read photo.")
        if (size != file.size || first != 255 || second != 216 || previous != 255 || last != 217) throw IncompletePhoto()
        val time = context.contentResolver.openInputStream(Uri.parse(file.uri))?.use {
            val exif = ExifInterface(it)
            SyncRules.captureTime(exif.getAttribute(ExifInterface.TAG_DATETIME_ORIGINAL), exif.getAttribute(ExifInterface.TAG_OFFSET_TIME_ORIGINAL), file.modified)
        } ?: error("Could not read photo date.")
        if (!WatchRules.sameVersion(file, metadata(context, file))) throw IncompletePhoto()
        return Photo(file.uri, file.name, size, SyncRules.hex(digest.digest()), time.first, time.second)
    }
}
