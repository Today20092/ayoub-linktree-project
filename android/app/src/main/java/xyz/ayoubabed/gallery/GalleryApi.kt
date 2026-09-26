package xyz.ayoubabed.gallery

import android.content.Context
import android.net.Network
import android.net.Uri
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import org.json.JSONObject
import org.json.JSONArray
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

class ApiException(val code: Int, message: String) : Exception(message)

object GalleryApi {
    private fun connection(site: String, path: String, token: String, network: Network? = null): HttpURLConnection {
        val url = URL(SyncRules.site(site) + path)
        return ((network?.openConnection(url) ?: url.openConnection()) as HttpURLConnection).apply {
            connectTimeout = 20_000; readTimeout = 90_000
            instanceFollowRedirects = false // Never forward a pairing key to a login page or another host.
            setRequestProperty("Authorization", "Bearer $token")
            setRequestProperty("Accept", "application/json")
        }
    }
    private fun result(conn: HttpURLConnection): JSONObject {
        val code = conn.responseCode
        val text = (if (code in 200..299) conn.inputStream else conn.errorStream)?.use {
            val bytes = it.readNBytes(8 * 1024 * 1024 + 1)
            if (bytes.size > 8 * 1024 * 1024) throw ApiException(413, "Gallery response is too large.")
            bytes.toString(Charsets.UTF_8)
        } ?: ""
        val obj = try { JSONObject(text) } catch (_: Exception) {
            if (code in 200..299) throw ApiException(502, "The website returned an unreadable response. Try again.")
            JSONObject()
        }
        if (code !in 200..299) throw ApiException(code, obj.optString("error").ifBlank {
            when(code) { 401, 403 -> "Pairing expired or denied. Reconnect in Settings."; in 300..399 -> "Server redirected the upload. Check the website address and companion API setup."; else -> "Website returned HTTP $code. Try again." }
        })
        return obj
    }
    private fun managePath(gallery: String) = "/api/companion/manage/${URLEncoder.encode(gallery, "UTF-8")}/"

    fun management(site: String, token: String, gallery: String, command: JSONObject? = null): JSONObject {
        val conn = connection(site, managePath(gallery), token)
        return try {
            if (command != null) {
                val bytes = command.toString().toByteArray()
                conn.requestMethod = "POST"; conn.doOutput = true
                conn.setRequestProperty("Content-Type", "application/json")
                conn.setFixedLengthStreamingMode(bytes.size)
                conn.outputStream.use { it.write(bytes) }
            }
            result(conn)
        } finally { conn.disconnect() }
    }

    fun replaceFlyer(context: Context, site: String, token: String, gallery: String, uri: Uri) {
        val mime = context.contentResolver.getType(uri) ?: "image/jpeg"
        require(mime in listOf("image/jpeg", "image/png", "image/webp", "image/heic", "image/heif")) { "Choose a JPEG, PNG, WebP, or HEIC image." }
        val bytes = context.contentResolver.openInputStream(uri)?.use { it.readNBytes(25 * 1024 * 1024 + 1) }
            ?: throw ApiException(400, "Could not open this photo.")
        require(bytes.size <= 25 * 1024 * 1024) { "Choose an image smaller than 25 MB." }
        val boundary = "Gallery${java.util.UUID.randomUUID()}"
        val header = "--$boundary\r\nContent-Disposition: form-data; name=\"action\"\r\n\r\nupdateFlyer\r\n--$boundary\r\nContent-Disposition: form-data; name=\"flyer\"; filename=\"cover.${mime.substringAfter('/')}\"\r\nContent-Type: $mime\r\n\r\n".toByteArray()
        val footer = "\r\n--$boundary--\r\n".toByteArray()
        val conn = connection(site, managePath(gallery), token)
        try {
            conn.requestMethod = "POST"; conn.doOutput = true
            conn.setRequestProperty("Content-Type", "multipart/form-data; boundary=$boundary")
            conn.setFixedLengthStreamingMode(header.size + bytes.size + footer.size)
            conn.outputStream.use { it.write(header); it.write(bytes); it.write(footer) }
            result(conn)
        } finally { conn.disconnect() }
    }

    fun managementPhoto(site: String, token: String, gallery: String, photo: JSONObject): Bitmap? {
        val privatePhoto = photo.getString("kind") in listOf("pending", "published")
        val conn = if (privatePhoto) connection(site, managePath(gallery) + "?photo=" + URLEncoder.encode(photo.getString("id"), "UTF-8"), token)
        else {
            val url = URL(photo.getString("src"))
            require(url.protocol == "https")
            (url.openConnection() as HttpURLConnection).apply {
                connectTimeout = 20_000; readTimeout = 30_000; instanceFollowRedirects = false
            }
        }
        return try {
            if (conn.responseCode != 200) throw ApiException(conn.responseCode, "Preview unavailable")
            val bytes = conn.inputStream.use { it.readNBytes(25 * 1024 * 1024 + 1) }
            require(bytes.size <= 25 * 1024 * 1024)
            val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
            val options = BitmapFactory.Options().apply {
                inSampleSize = 1
                while (bounds.outWidth / inSampleSize > 1200 || bounds.outHeight / inSampleSize > 1200) inSampleSize *= 2
            }
            BitmapFactory.decodeByteArray(bytes, 0, bytes.size, options)
        } finally { conn.disconnect() }
    }
    fun galleries(site: String, token: String): List<Gallery> {
        val conn = connection(site, "/api/companion/galleries/", token)
        return try {
            val list = result(conn).getJSONArray("galleries")
            (0 until list.length()).map { i -> list.getJSONObject(i).let { Gallery(it.getString("id"), it.getString("title"), it.optString("category"), it.getString("status")) } }
        } finally { conn.disconnect() }
    }
    fun upload(context: Context, site: String, gallery: String, token: String, item: QueueItem, network: Network?): String {
        fun encode(value: String) = URLEncoder.encode(value, "UTF-8")
        val conn = connection(site, "/api/companion/upload/?gallery=${encode(gallery)}&filename=${encode(item.name)}", token, network)
        return try {
            conn.requestMethod = "POST"; conn.doOutput = true
            conn.setRequestProperty("Content-Type", "image/jpeg")
            conn.setRequestProperty("X-Content-SHA256", item.hash)
            conn.setFixedLengthStreamingMode(item.size)
            context.contentResolver.openInputStream(Uri.parse(item.uri))?.use { input ->
                conn.outputStream.use { output -> input.copyTo(output, 64 * 1024) }
            } ?: throw ApiException(400, "Photo is no longer available. Scan the folder again.")
            val status = result(conn).optString("status")
            if (status !in listOf("uploaded", "skipped")) throw ApiException(502, "Unexpected server response. Try again.")
            status
        } finally { conn.disconnect() }
    }
    fun known(site: String, gallery: String, token: String, hashes: List<String>, network: Network?): Set<String> {
        val known = mutableSetOf<String>()
        for (chunk in hashes.chunked(400)) {
            val conn = connection(site, "/api/companion/known/", token, network)
            try {
                val bytes = JSONObject().put("gallery", gallery).put("hashes", JSONArray(chunk)).toString().toByteArray()
                conn.requestMethod = "POST"; conn.doOutput = true
                conn.setRequestProperty("Content-Type", "application/json")
                conn.setFixedLengthStreamingMode(bytes.size)
                conn.outputStream.use { it.write(bytes) }
                val values = result(conn).getJSONArray("known")
                for(i in 0 until values.length()) known.add(values.getString(i))
            } finally { conn.disconnect() }
        }
        return known
    }
}
