package xyz.ayoubabed.gallery

import android.content.Intent
import android.graphics.Bitmap
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.*
import org.json.JSONArray
import org.json.JSONObject
import java.time.LocalDate

private fun JSONArray.objects() = (0 until length()).map { getJSONObject(it) }

@Composable
private fun ManagementCard(title: String, description: String? = null, content: @Composable ColumnScope.() -> Unit) {
    Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow)) {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Text(title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold)
            description?.let { Text(it, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant) }
            content()
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GalleryManager(gallery: Gallery, store: Store, onBack: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val site = remember { store.prefs.getString("site", "")!! }
    val token = remember { store.token() }
    var section by rememberSaveable(gallery.id) { mutableStateOf("Details") }
    var data by remember { mutableStateOf<JSONObject?>(null) }
    var draft by rememberSaveable(gallery.id) { mutableStateOf("") }
    var savedDraft by rememberSaveable(gallery.id) { mutableStateOf("") }
    var enabled by rememberSaveable(gallery.id) { mutableStateOf(false) }
    var savedEnabled by rememberSaveable(gallery.id) { mutableStateOf(false) }
    var password by remember { mutableStateOf("") }
    var guestName by rememberSaveable(gallery.id) { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var message by remember { mutableStateOf<String?>(null) }
    var datePicker by remember { mutableStateOf(false) }
    var discard by remember { mutableStateOf(false) }
    var confirm by remember { mutableStateOf<Pair<String, JSONObject>?>(null) }
    var filter by rememberSaveable(gallery.id) { mutableStateOf("pending") }
    val dirty = draft != savedDraft || enabled != savedEnabled || password.isNotEmpty()

    fun leave() { if (!busy) { if (dirty) discard = true else onBack() } }
    BackHandler { leave() }
    fun load() {
        scope.launch {
            busy = true; error = null
            try {
                val result = withContext(Dispatchers.IO) { GalleryApi.management(site, token, gallery.id) }
                data = result
                if (draft.isEmpty()) {
                    draft = result.getJSONObject("event").toString(); savedDraft = draft
                    enabled = result.getJSONObject("settings").getBoolean("uploadsEnabled"); savedEnabled = enabled
                }
            } catch (e: CancellationException) { throw e }
            catch (e: Exception) { error = e.message ?: "Could not load gallery." }
            finally { busy = false }
        }
    }
    fun command(value: JSONObject, success: String) {
        scope.launch {
            busy = true; error = null; message = null
            try {
                withContext(Dispatchers.IO) { GalleryApi.management(site, token, gallery.id, value) }
                when (value.getString("action")) {
                    "updateEvent" -> savedDraft = draft
                    "settings" -> { savedEnabled = enabled; password = "" }
                    "createInvite" -> guestName = ""
                }
                message = success
                try { data = withContext(Dispatchers.IO) { GalleryApi.management(site, token, gallery.id) } }
                catch (e: CancellationException) { throw e }
                catch (_: Exception) { error = "Saved, but the updated gallery could not be loaded. Reopen it to refresh." }
            } catch (e: CancellationException) { throw e }
            catch (e: Exception) { error = e.message ?: "Could not save. Your changes are still here." }
            finally { busy = false }
        }
    }
    val flyerPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null) scope.launch {
            busy = true; error = null; message = null
            try {
                withContext(Dispatchers.IO) { GalleryApi.replaceFlyer(context, site, token, gallery.id, uri) }
                message = "Flyer and cover updated."
                data = withContext(Dispatchers.IO) { GalleryApi.management(site, token, gallery.id) }
            } catch (e: CancellationException) { throw e }
            catch (e: Exception) { error = e.message ?: "Could not replace flyer." }
            finally { busy = false }
        }
    }
    fun share(url: String) {
        context.startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).apply { type = "text/plain"; putExtra(Intent.EXTRA_TEXT, url) }, "Share gallery link"))
    }
    LaunchedEffect(gallery.id) { load() }
    val event = if (draft.isNotEmpty()) JSONObject(draft) else JSONObject()
    fun field(name: String, value: String) { draft = JSONObject(draft).put(name, value).toString() }
    val photos = data?.optJSONArray("photos")?.objects().orEmpty()
    val pendingCount = photos.count { it.optString("kind") == "pending" }

    if (datePicker) GalleryDateDialog(
        initial = runCatching { LocalDate.parse(event.optString("eventDate")) }.getOrDefault(LocalDate.now()),
        onDismiss = { datePicker = false }, onSelect = { field("eventDate", it.toString()); datePicker = false })
    if (discard) AlertDialog(onDismissRequest = { discard = false }, title = { Text("Discard unsaved changes?") },
        text = { Text("Your edits to event details or guest access have not been saved.") },
        confirmButton = { TextButton(onClick = onBack) { Text("Discard") } },
        dismissButton = { TextButton(onClick = { discard = false }) { Text("Keep editing") } })
    confirm?.let { (title, value) -> AlertDialog(onDismissRequest = { confirm = null }, title = { Text(title) },
        text = { Text("This permanently deletes the selected guest photo.") },
        confirmButton = { TextButton(onClick = { confirm = null; command(value, "Photo removed.") }) { Text("Delete photo", color = MaterialTheme.colorScheme.error) } },
        dismissButton = { TextButton(onClick = { confirm = null }) { Text("Cancel") } }) }

    Scaffold(topBar = { TopAppBar(title = { Text(gallery.title, maxLines = 1) }, navigationIcon = {
        IconButton(onClick = { leave() }, enabled = !busy) { Icon(Icons.AutoMirrored.Outlined.ArrowBack, "Back to galleries") }
    }) }) { padding ->
        LazyColumn(Modifier.fillMaxSize().padding(padding).imePadding(), contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            item {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(listOf("Details", "Access", "Photos", "Sharing")) { label ->
                        FilterChip(selected = section == label, onClick = { section = label }, label = { Text(if (label == "Photos" && pendingCount > 0) "Photos · $pendingCount pending" else label) })
                    }
                }
            }
            if (busy) item { LinearProgressIndicator(Modifier.fillMaxWidth()) }
            error?.let { text -> item {
                Surface(color = MaterialTheme.colorScheme.errorContainer, shape = RoundedCornerShape(16.dp)) {
                    Column(Modifier.fillMaxWidth().padding(16.dp)) {
                        Text(text)
                        if (data == null) TextButton(onClick = { load() }, enabled = !busy) { Text("Retry") }
                    }
                }
            } }
            message?.let { text -> item { Text(text, color = MaterialTheme.colorScheme.primary) } }
            if (data != null) when (section) {
                "Details" -> {
                    item { ManagementCard("Event details", "These details appear on your website.") {
                        listOf("title" to "Name", "category" to "Category", "summary" to "About", "eventVenue" to "Venue").forEach { (name, label) ->
                            OutlinedTextField(event.optString(name), { field(name, it) }, label = { Text(label) }, enabled = !busy,
                                modifier = Modifier.fillMaxWidth(), singleLine = name != "summary", minLines = if (name == "summary") 3 else 1,
                                shape = RoundedCornerShape(16.dp))
                        }
                        OutlinedButton(onClick = { datePicker = true }, enabled = !busy, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) {
                            Icon(Icons.Outlined.CalendarMonth, null); Spacer(Modifier.width(8.dp)); Text(event.optString("eventDate").ifBlank { "Choose event date" })
                        }
                        if (event.optString("eventDate").isNotEmpty()) TextButton(onClick = { field("eventDate", "") }, enabled = !busy) { Text("Clear date") }
                        OutlinedTextField(event.optString("eventTime"), { field("eventTime", it) }, label = { Text("Event time") },
                            supportingText = { Text("For example, 6:00 PM – 9:00 PM") }, enabled = !busy, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp))
                    } }
                    item { ManagementCard("Visibility") {
                        listOf("published" to "Published", "coming_soon" to "Coming soon", "hidden" to "Hidden").forEach { (value, label) ->
                            Surface(onClick = { field("visibilityStatus", value) }, enabled = !busy, shape = RoundedCornerShape(16.dp),
                                color = if (event.optString("visibilityStatus") == value) MaterialTheme.colorScheme.secondaryContainer else MaterialTheme.colorScheme.surfaceContainerLow) {
                                Row(Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                    RadioButton(selected = event.optString("visibilityStatus") == value, onClick = null)
                                    Column(Modifier.padding(start = 12.dp)) {
                                        Text(label, fontWeight = FontWeight.Medium)
                                        Text(when(value) { "published" -> "Show gallery and photos"; "coming_soon" -> "Show event, keep photos private"; else -> "Remove from public pages" }, style = MaterialTheme.typography.bodySmall)
                                    }
                                }
                            }
                        }
                        Button(onClick = { command(JSONObject(draft).put("action", "updateEvent").put("comingSoon", event.optString("visibilityStatus") == "coming_soon"), "Event saved.") },
                            enabled = !busy && event.optString("title").isNotBlank() && event.optString("summary").isNotBlank(), modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp)) { Text("Save event") }
                    } }
                }
                "Access" -> {
                    item { ManagementCard("Guest uploads", "Password-protected submissions wait for your approval.") {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("Accept guest uploads", Modifier.weight(1f))
                            Switch(enabled, onCheckedChange = { enabled = it }, enabled = !busy)
                        }
                        OutlinedTextField(password, { password = it }, label = { Text("Upload password") }, visualTransformation = PasswordVisualTransformation(),
                            enabled = !busy, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp),
                            supportingText = { Text(if (data!!.getJSONObject("settings").optBoolean("hasPassword")) "Leave blank to keep the current password." else "Use 8–128 characters.") })
                        Button(onClick = { command(JSONObject().put("action", "settings").put("uploadsEnabled", enabled).apply { if (password.isNotEmpty()) put("password", password) }, "Guest access saved.") },
                            enabled = !busy && (password.isEmpty() || password.length in 8..128), modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp)) { Text("Save guest access") }
                    } }
                    item { ManagementCard("Guest invite links", "Invited guests upload directly without a password or review. Only share with people you trust.") {
                        OutlinedTextField(guestName, { guestName = it.take(120) }, label = { Text("Guest name") }, enabled = !busy, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp))
                        Button(onClick = { command(JSONObject().put("action", "createInvite").put("guestName", guestName), "Invite created. Share it below.") }, enabled = !busy && guestName.isNotBlank(), modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) { Text("Create invite") }
                    } }
                    items(data!!.getJSONArray("invites").objects(), key = { it.getString("token") }) { invite ->
                        ListItem(headlineContent = { Text(invite.getString("guest_name")) }, supportingContent = { Text("Direct upload access") },
                            trailingContent = { IconButton(onClick = { share("$site/galleries/${gallery.id}/upload/${invite.getString("token")}/") }) { Icon(Icons.Outlined.Share, "Share invite for ${invite.getString("guest_name")}") } })
                    }
                }
                "Sharing" -> {
                    item { ManagementCard("Public gallery", "Share the gallery with attendees.") {
                        Text("$site/galleries/${gallery.id}/", style = MaterialTheme.typography.bodySmall)
                        FilledTonalButton(onClick = { share("$site/galleries/${gallery.id}/") }, modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp)) { Icon(Icons.Outlined.Share, null); Spacer(Modifier.width(8.dp)); Text("Share gallery") }
                    } }
                    item { ManagementCard("Flyer and cover", "Choose a new image, or set a published photo as the cover from Photos.") {
                        Button(onClick = { flyerPicker.launch("image/*") }, enabled = !busy, modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp)) { Icon(Icons.Outlined.AddPhotoAlternate, null); Spacer(Modifier.width(8.dp)); Text("Replace flyer and cover") }
                    } }
                }
                "Photos" -> {
                    item { LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(listOf("pending" to "Review", "published" to "Guest photos", "uploaded" to "Uploads", "professional" to "Professional", "hidden" to "Hidden")) { (value, label) ->
                            FilterChip(selected = filter == value, onClick = { filter = value }, label = { Text("$label (${photos.count { it.optString("kind") == value }})") })
                        }
                    } }
                    if (filter in listOf("professional", "hidden")) item { Text("Hidden photos are removed from the live gallery. Existing Download All ZIP files are unchanged.", style = MaterialTheme.typography.bodySmall) }
                    val filtered = photos.filter { it.getString("kind") == filter }
                    if (filtered.isEmpty()) item { ManagementCard("No photos here", if (filter == "pending") "You're all caught up. New guest submissions will appear here." else "Use the gallery's photo source to upload photographer photos.") {} }
                    items(filtered, key = { "${it.getString("kind")}:${it.getString("id")}" }) { photo ->
                        ManagementCard(photo.getString("label")) {
                            GalleryPhotoPreview(site, token, gallery.id, photo)
                            val kind = photo.getString("kind")
                            val id = photo.getString("id")
                            if (kind == "pending") Button(onClick = { command(JSONObject().put("action", "approveGuest").put("photoId", id), "Photo published.") }, enabled = !busy, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) { Text("Approve photo") }
                            if (kind in listOf("pending", "published")) OutlinedButton(onClick = { confirm = "Delete this photo?" to JSONObject().put("action", if (kind == "pending") "rejectGuest" else "removeGuest").put("photoId", id) }, enabled = !busy, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) { Text(if (kind == "pending") "Reject photo" else "Remove photo", color = MaterialTheme.colorScheme.error) }
                            if (kind in listOf("professional", "hidden")) OutlinedButton(onClick = { command(JSONObject().put("action", if (kind == "hidden") "restoreProfessional" else "hideProfessional").put("filename", id), if (kind == "hidden") "Photo restored." else "Photo hidden.") }, enabled = !busy, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) { Text(if (kind == "hidden") "Restore photo" else "Hide photo") }
                            if (kind !in listOf("pending", "hidden")) {
                                val isCover = data!!.getJSONObject("event").optString("coverSrc") == photo.getString("src")
                                FilledTonalButton(onClick = { command(JSONObject().put("action", "setCover").put("src", photo.getString("src")).put("alt", photo.optString("alt").ifBlank { gallery.title }).put("width", photo.getInt("width")).put("height", photo.getInt("height")), "Cover updated.") }, enabled = !busy && !isCover, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) { Text(if (isCover) "Current cover" else "Use as cover") }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun GalleryPhotoPreview(site: String, token: String, gallery: String, photo: JSONObject) {
    var bitmap by remember(photo.getString("id")) { mutableStateOf<Bitmap?>(null) }
    var failed by remember { mutableStateOf(false) }
    var attempt by remember { mutableIntStateOf(0) }
    LaunchedEffect(photo.getString("id"), attempt) {
        failed = false
        try {
            bitmap = withContext(Dispatchers.IO) { GalleryApi.managementPhoto(site, token, gallery, photo) }
            failed = bitmap == null
        } catch (e: CancellationException) { throw e }
        catch (_: Exception) { failed = true }
    }
    Box(Modifier.fillMaxWidth().height(240.dp), contentAlignment = Alignment.Center) {
        bitmap?.let { Image(it.asImageBitmap(), photo.optString("alt").ifBlank { photo.getString("label") }, Modifier.fillMaxSize(), contentScale = ContentScale.Fit) }
            ?: if (failed) TextButton(onClick = { attempt++ }) { Text("Retry photo preview") } else CircularProgressIndicator()
    }
}
