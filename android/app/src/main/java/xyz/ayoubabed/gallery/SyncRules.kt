package xyz.ayoubabed.gallery

import java.net.URI
import java.time.LocalDateTime
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.security.MessageDigest

object SyncRules {
    const val PRODUCTION_SITE = "https://ayoubabed.xyz"
    const val MAX_BYTES = 20L * 1024 * 1024
    fun site(value: String): String {
        val uri = URI(value.trim())
        require(uri.scheme == "https" && !uri.host.isNullOrBlank() && uri.userInfo == null && uri.rawQuery == null && uri.fragment == null && (uri.path.isNullOrEmpty() || uri.path == "/")) {
            "Enter an HTTPS website address without a path."
        }
        return "https://${uri.rawAuthority}".trimEnd('/')
    }
    fun jpeg(name: String) = name.endsWith(".jpg", true) || name.endsWith(".jpeg", true)
    fun captureTime(exif: String?, offset: String?, fallback: Long, zone: ZoneId = ZoneId.systemDefault()): Pair<Long, Boolean> {
        if (exif != null) try {
            val local = LocalDateTime.parse(exif, DateTimeFormatter.ofPattern("yyyy:MM:dd HH:mm:ss"))
            val instant = if (!offset.isNullOrBlank()) OffsetDateTime.of(local, ZoneOffset.of(offset)).toInstant() else local.atZone(zone).toInstant()
            return instant.toEpochMilli() to false
        } catch (_: Exception) { /* Some cameras write malformed EXIF. */ }
        return fallback to true
    }
    fun sha256(bytes: ByteArray): String = hex(MessageDigest.getInstance("SHA-256").digest(bytes))
    fun hex(bytes: ByteArray) = bytes.joinToString("") { "%02x".format(it) }
    fun retryable(code: Int) = code == 409 || code == 408 || code == 429 || code in 500..599
}
