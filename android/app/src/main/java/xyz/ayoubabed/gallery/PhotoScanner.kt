package xyz.ayoubabed.gallery

import android.content.Context
import android.net.Uri
import androidx.documentfile.provider.DocumentFile
import androidx.exifinterface.media.ExifInterface
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import java.security.MessageDigest

data class ScanResult(val photos: List<Photo>, val tooLarge: Int, val unreadable: Int)

object PhotoScanner {
    suspend fun scan(context: Context, folder: String, since: Long, progress: (Int) -> Unit): ScanResult {
        val root = DocumentFile.fromTreeUri(context, Uri.parse(folder))
        require(root != null && root.exists() && root.canRead()) { "Folder access was lost. Choose the folder again." }
        val photos = mutableListOf<Photo>()
        var tooLarge = 0
        var unreadable = 0
        var scanned = 0
        suspend fun visit(dir: DocumentFile) {
            currentCoroutineContext().ensureActive()
            for (file in dir.listFiles()) {
                currentCoroutineContext().ensureActive()
                if (file.isDirectory) { visit(file); continue }
                val name = file.name ?: continue
                if (!SyncRules.jpeg(name)) continue
                progress(++scanned)
                if (file.length() > SyncRules.MAX_BYTES) { tooLarge++; continue }
                try {
                    val time = context.contentResolver.openInputStream(file.uri)?.use {
                        val exif = ExifInterface(it)
                        SyncRules.captureTime(exif.getAttribute(ExifInterface.TAG_DATETIME_ORIGINAL), exif.getAttribute(ExifInterface.TAG_OFFSET_TIME_ORIGINAL), file.lastModified())
                    } ?: throw IllegalStateException("Could not open photo")
                    if (time.first < since) continue
                    val digest = MessageDigest.getInstance("SHA-256")
                    var size = 0L
                    context.contentResolver.openInputStream(file.uri)?.use { input ->
                        val buffer = ByteArray(64 * 1024)
                        while (true) {
                            currentCoroutineContext().ensureActive()
                            val count = input.read(buffer)
                            if (count < 0) break
                            size += count
                            require(size <= SyncRules.MAX_BYTES) { "Photo is too large" }
                            digest.update(buffer, 0, count)
                        }
                    } ?: throw IllegalStateException("Could not read photo")
                    if (size > 0) photos.add(Photo(file.uri.toString(), name, size, SyncRules.hex(digest.digest()), time.first, time.second)) else unreadable++
                } catch (error: kotlinx.coroutines.CancellationException) { throw error }
                catch (_: Exception) { unreadable++ }
            }
        }
        visit(root)
        return ScanResult(photos.distinctBy { it.hash }.sortedBy { it.taken }, tooLarge, unreadable)
    }
}
