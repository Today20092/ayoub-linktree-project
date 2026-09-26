package xyz.ayoubabed.gallery

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.AddPhotoAlternate
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.*
import org.json.JSONObject

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GalleryCreator(onBack: () -> Unit, onCreated: (Gallery) -> Unit,
    create: suspend (JSONObject) -> Gallery) {
    var title by rememberSaveable { mutableStateOf("") }
    var summary by rememberSaveable { mutableStateOf("") }
    var category by rememberSaveable { mutableStateOf("Event Photography") }
    // Keep a stable URL across retries, including a lost response after successful creation.
    val slug = rememberSaveable { "gallery-${java.util.UUID.randomUUID()}" }
    var status by rememberSaveable { mutableStateOf("hidden") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var discard by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    fun back() { if (!busy) { if (title.isNotBlank() || summary.isNotBlank()) discard = true else onBack() } }
    BackHandler { back() }
    if (discard) AlertDialog(onDismissRequest = { discard = false },
        title = { Text("Discard new gallery?") }, text = { Text("Your gallery has not been saved.") },
        confirmButton = { TextButton(onClick = onBack) { Text("Discard") } },
        dismissButton = { TextButton(onClick = { discard = false }) { Text("Keep editing") } })
    Scaffold(topBar = { TopAppBar(title = { Text("New gallery") },
        navigationIcon = { IconButton(onClick = { back() }, enabled = !busy) { Icon(Icons.AutoMirrored.Outlined.ArrowBack, "Back") } }) }) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).imePadding().verticalScroll(rememberScrollState()).padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Text("Create a gallery, then add its date, cover, photos, and guest settings.", style = MaterialTheme.typography.bodyLarge)
            OutlinedTextField(title, { title = it.take(200) }, label = { Text("Gallery name") }, singleLine = true, enabled = !busy, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(summary, { summary = it.take(5000) }, label = { Text("About this gallery") }, minLines = 3, enabled = !busy, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(category, { category = it.take(120) }, label = { Text("Category") }, singleLine = true, enabled = !busy, modifier = Modifier.fillMaxWidth())
            Text("Visibility", style = MaterialTheme.typography.titleMedium)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("hidden" to "Hidden", "coming_soon" to "Coming soon", "published" to "Published").forEach { (value, label) ->
                    FilterChip(selected = status == value, onClick = { status = value }, enabled = !busy, label = { Text(label) })
                }
            }
            Text(when(status) {
                "hidden" -> "Only you can see this gallery until you publish it. You can upload photos now."
                "coming_soon" -> "Show the gallery on your website, with its photos hidden."
                else -> "Show the gallery and its photos on your website."
            }, style = MaterialTheme.typography.bodyMedium)
            error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            Button(onClick = {
                busy = true; error = null
                scope.launch {
                    try {
                        val gallery = create(JSONObject().put("title", title.trim()).put("summary", summary.trim())
                            .put("category", category.trim()).put("visibilityStatus", status).put("slug", slug))
                        onCreated(gallery)
                    } catch (e: Exception) { error = e.message ?: "Could not create the gallery. Your details are still here." }
                    finally { busy = false }
                }
            }, enabled = !busy && title.isNotBlank() && summary.isNotBlank(), modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp)) {
                if (busy) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp)
                else Icon(Icons.Outlined.AddPhotoAlternate, null)
                Spacer(Modifier.width(8.dp)); Text(if (busy) "Creating…" else "Create gallery")
            }
        }
    }
}
