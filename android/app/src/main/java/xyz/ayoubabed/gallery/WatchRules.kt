package xyz.ayoubabed.gallery

data class WatchedFile(val path: String, val uri: String, val name: String, val size: Long, val modified: Long)
data class WatchEntry(val file: WatchedFile, val state: String, val stableSince: Long, val failures: Int = 0)
data class WatchSession(val folder: String, val since: Long, val status: String, val message: String)

object WatchRules {
    const val POLL_MS = 5_000L
    const val SETTLE_MS = 5_000L
    fun sameVersion(a: WatchedFile, b: WatchedFile) = a.uri == b.uri && a.size == b.size && a.modified == b.modified
    fun observe(previous: WatchEntry?, file: WatchedFile, now: Long): WatchEntry {
        if (previous != null && previous.state !in listOf("waiting", "failed")) return previous
        return if (previous != null && sameVersion(previous.file, file) && now >= previous.stableSince) previous
        else WatchEntry(file, "waiting", now)
    }
    fun ready(entry: WatchEntry, now: Long) = entry.state == "waiting" && now - entry.stableSince >= SETTLE_MS && entry.file.size > 0
}
