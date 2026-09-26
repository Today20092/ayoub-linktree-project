package xyz.ayoubabed.gallery

import android.content.Context
import android.net.Network
import android.net.Uri
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
        val text = (if (code in 200..299) conn.inputStream else conn.errorStream)?.bufferedReader()?.use { it.readText().take(4096) } ?: ""
        val obj = try { JSONObject(text) } catch (_: Exception) { JSONObject() }
        if (code !in 200..299) throw ApiException(code, obj.optString("error").ifBlank {
            when(code) { 401, 403 -> "Pairing expired or denied. Reconnect in Settings."; in 300..399 -> "Server redirected the upload. Check the website address and companion API setup."; else -> "Website returned HTTP $code. Try again." }
        })
        return obj
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
