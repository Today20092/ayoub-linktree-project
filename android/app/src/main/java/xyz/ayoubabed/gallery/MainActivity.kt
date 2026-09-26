package xyz.ayoubabed.gallery

import android.Manifest
import android.app.job.JobScheduler
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedContent
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.*
import java.text.DateFormat
import java.util.Date
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent { GalleryTheme { GalleryApp(this) } }
    }
}

@Composable
fun GalleryTheme(content: @Composable () -> Unit) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val dark = isSystemInDarkTheme()
    val scheme = if (dark) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
    MaterialTheme(colorScheme = scheme, shapes = Shapes(
        small = RoundedCornerShape(12.dp), medium = RoundedCornerShape(20.dp),
        large = RoundedCornerShape(28.dp), extraLarge = RoundedCornerShape(32.dp)
    ), content = content)
}

@Composable
private fun SectionCard(title: String, icon: ImageVector, subtitle: String? = null, content: @Composable ColumnScope.() -> Unit) {
    Card(shape = RoundedCornerShape(28.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow), modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(24.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(icon, null, tint = MaterialTheme.colorScheme.primary)
                Text(title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold)
            }
            if (subtitle != null) Text(subtitle, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            content()
        }
    }
}

@Composable
private fun Message(text: String, error: Boolean = false) {
    Surface(shape = RoundedCornerShape(20.dp), color = if(error) MaterialTheme.colorScheme.errorContainer else MaterialTheme.colorScheme.secondaryContainer, modifier = Modifier.fillMaxWidth()) {
        Row(Modifier.padding(16.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Icon(if(error) Icons.Outlined.ErrorOutline else Icons.Outlined.Info, null)
            Text(text, style = MaterialTheme.typography.bodyMedium)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun GalleryApp(activity: MainActivity) {
    val store = remember { Store(activity) }
    val scope = rememberCoroutineScope()
    var tab by rememberSaveable { mutableIntStateOf(0) }
    var website by rememberSaveable { mutableStateOf(store.prefs.getString("site", "https://ayoub-linktree-project-preview.ayoub-abedrabbo.workers.dev")!!) }
    var key by rememberSaveable { mutableStateOf("") }
    var connected by remember { mutableStateOf(store.token().isNotBlank()) }
    var galleries by remember { mutableStateOf(emptyList<Gallery>()) }
    var gallerySearch by rememberSaveable { mutableStateOf("") }
    var selected by remember { mutableStateOf<Gallery?>(null) }
    var folder by rememberSaveable { mutableStateOf("") }
    var since by rememberSaveable { mutableLongStateOf(0L) }
    var wifi by rememberSaveable { mutableStateOf(store.prefs.getBoolean("wifi", false)) }
    var busy by remember { mutableStateOf(false) }
    var scanned by remember { mutableIntStateOf(0) }
    var scan by remember { mutableStateOf<ScanResult?>(null) }
    var problem by remember { mutableStateOf<String?>(null) }
    var queue by remember { mutableStateOf(store.items()) }
    var status by remember { mutableStateOf(store.prefs.getString("message", "No uploads yet.")!!) }
    var scheduled by remember { mutableStateOf(false) }
    var clearConfirm by remember { mutableStateOf(false) }
    var managing by remember { mutableStateOf<Gallery?>(null) }
    var pickSinceDate by remember { mutableStateOf(false) }
    var sinceDate by remember { mutableStateOf<LocalDate?>(null) }
    val notice = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { }

    fun refresh() {
        scope.launch {
            busy = true; problem = null
            try { galleries = withContext(Dispatchers.IO) { GalleryApi.galleries(store.prefs.getString("site", "")!!, store.token()) } }
            catch (e: Exception) { problem = e.message ?: "Could not load galleries." }
            finally { busy = false }
        }
    }
    fun select(gallery: Gallery) {
        selected = gallery
        val source = store.source(gallery.id)
        folder = source.first; since = source.second; scan = null; problem = null
        store.prefs.edit().putString("last_gallery", gallery.id).apply()
    }
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocumentTree()) { uri ->
        if (uri != null) try {
            activity.contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
            folder = uri.toString(); scan = null
            selected?.let { store.saveSource(it.id, folder, since) }
        } catch (_: Exception) { problem = "Could not keep access to that folder. Choose another folder." }
    }
    fun schedule() {
        notice.launch(Manifest.permission.POST_NOTIFICATIONS)
        try {
            if (!UploadJobService.schedule(activity, wifi)) problem = "Android could not start the upload. Tap Resume to try again."
        } catch (e: Exception) { problem = e.message ?: "Could not schedule uploads." }
        tab = 1; queue = store.items()
    }
    LaunchedEffect(Unit) { if (connected) refresh() }
    LaunchedEffect(galleries) {
        if(selected == null) galleries.firstOrNull { it.id == store.prefs.getString("last_gallery", "") }?.let { select(it) }
        else galleries.firstOrNull { it.id == selected?.id }?.let { selected = it }
    }
    LaunchedEffect(Unit) {
        while(true) {
            queue = withContext(Dispatchers.IO) { store.items() }
            status = UploadJobService.pendingMessage(activity, wifi) ?: store.prefs.getString("message", "No uploads yet.")!!
            scheduled = activity.getSystemService(JobScheduler::class.java).getPendingJob(UploadJobService.JOB_ID) != null
            delay(1000)
        }
    }
    managing?.let { gallery ->
        GalleryManager(gallery, store, onBack = { managing = null; refresh() })
        return
    }
    if (pickSinceDate) GalleryDateDialog(
        initial = Instant.ofEpochMilli(if (since == 0L) System.currentTimeMillis() else since).atZone(ZoneId.systemDefault()).toLocalDate(),
        onDismiss = { pickSinceDate = false },
        onSelect = { sinceDate = it; pickSinceDate = false })
    sinceDate?.let { date -> GalleryTimeDialog(
        initial = Instant.ofEpochMilli(if (since == 0L) System.currentTimeMillis() else since).atZone(ZoneId.systemDefault()).toLocalTime(),
        onDismiss = { sinceDate = null },
        onSelect = { time ->
            since = date.atTime(time).atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()
            sinceDate = null; scan = null; selected?.let { store.saveSource(it.id, folder, since) }
        }) }
    val titles = listOf("Galleries", "Uploads", "Settings")
    val icons = listOf(Icons.Outlined.PhotoLibrary, Icons.Outlined.CloudUpload, Icons.Outlined.Settings)
    Scaffold(
        topBar = { LargeTopAppBar(title = { Text(titles[tab], fontWeight = FontWeight.Bold) }, actions = {
            if(tab == 0 && connected) IconButton(onClick = { refresh() }, enabled = !busy) { Icon(Icons.Outlined.Refresh, "Refresh galleries") }
        }) },
        bottomBar = {
            NavigationBar {
                titles.forEachIndexed { i, title -> NavigationBarItem(selected = tab == i, onClick = { tab = i; problem = null }, icon = { Icon(icons[i], null) }, label = { Text(title) }) }
            }
        }
    ) { padding ->
        Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.TopCenter) {
            LazyColumn(Modifier.widthIn(max = 640.dp).fillMaxSize(), contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 8.dp, bottom = 32.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                if (problem != null) item { Message(problem!!, true) }
                when(tab) {
                    0 -> {
                        item {
                            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer), shape = RoundedCornerShape(32.dp)) {
                                Column(Modifier.fillMaxWidth().padding(28.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                    Icon(Icons.Outlined.CameraAlt, null, Modifier.size(32.dp))
                                    Text("Your galleries", style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.Bold)
                                    Text("Publish photos, edit events, and manage guest access.", style = MaterialTheme.typography.bodyLarge)
                                    if(!connected) Button(onClick = { tab = 2 }, modifier = Modifier.padding(top = 8.dp)) { Text("Connect your website") }
                                }
                            }
                        }
                        if(connected) {
                            item { Text("CHOOSE A GALLERY", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(top = 8.dp)) }
                            item { OutlinedTextField(gallerySearch, { gallerySearch = it }, label = { Text("Find a gallery") },
                                leadingIcon = { Icon(Icons.Outlined.Search, null) }, singleLine = true, shape = RoundedCornerShape(20.dp), modifier = Modifier.fillMaxWidth()) }
                            if(busy && galleries.isEmpty()) item { LinearProgressIndicator(Modifier.fillMaxWidth()) }
                            if(galleries.isEmpty() && !busy) item { Message("No galleries loaded. Refresh, or create a gallery in the dashboard.") }
                            items(galleries.filter { it.title.contains(gallerySearch, ignoreCase = true) || it.category.contains(gallerySearch, ignoreCase = true) }, key = { it.id }) { gallery ->
                                val active = selected?.id == gallery.id
                                Card(onClick = { if(!busy) select(gallery) }, shape = RoundedCornerShape(24.dp), colors = CardDefaults.cardColors(containerColor = if(active) MaterialTheme.colorScheme.secondaryContainer else MaterialTheme.colorScheme.surfaceContainerLow)) {
                                    Row(Modifier.fillMaxWidth().padding(20.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                                        Icon(if(active) Icons.Outlined.CheckCircle else Icons.Outlined.Collections, null, tint = MaterialTheme.colorScheme.primary)
                                        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                            Text(gallery.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                                            Text(if(gallery.status == "published") gallery.category else gallery.status.replace('_', ' '), style = MaterialTheme.typography.bodySmall)
                                        }
                                        IconButton(onClick = { managing = gallery }, enabled = !busy) { Icon(Icons.Outlined.Tune, "Manage ${gallery.title}") }
                                    }
                                }
                            }
                            selected?.let { gallery ->
                                item {
                                    FilledTonalButton(onClick = { managing = gallery }, enabled = !busy, modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp)) {
                                        Icon(Icons.Outlined.Tune, null); Spacer(Modifier.width(8.dp)); Text("Manage ${gallery.title}")
                                    }
                                }
                                if(gallery.status != "published") item { Message("This gallery is ${gallery.status.replace('_',' ')}. You can upload now; its visibility stays unchanged.") }
                                item {
                                    SectionCard("Photo source", Icons.Outlined.FolderOpen, "Choose the LUMIX transfer folder or a folder from your SD card. Subfolders are included.") {
                                        FilledTonalButton(onClick = { picker.launch(folder.takeIf { it.isNotBlank() }?.let(Uri::parse)) }, enabled = !busy, modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp)) {
                                            Icon(Icons.Outlined.FolderOpen, null); Spacer(Modifier.width(8.dp)); Text(if(folder.isBlank()) "Choose folder" else "Change folder")
                                        }
                                        if(folder.isNotBlank()) Text(Uri.decode(folder.substringAfterLast('/')), style = MaterialTheme.typography.bodyMedium)
                                        HorizontalDivider()
                                        Text("Photos taken since", style = MaterialTheme.typography.titleSmall)
                                        OutlinedButton(onClick = { pickSinceDate = true }, enabled = !busy, modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp)) {
                                            Icon(Icons.Outlined.Schedule,null); Spacer(Modifier.width(8.dp)); Text(if(since == 0L) "All photos in this folder" else DateFormat.getDateTimeInstance(DateFormat.MEDIUM,DateFormat.SHORT).format(Date(since)))
                                        }
                                        if(since != 0L) TextButton(onClick = { since = 0; scan = null; store.saveSource(gallery.id,folder,0) }) { Text("Include all dates") }
                                        Text("Camera time uses your phone’s timezone unless the photo includes one.", style = MaterialTheme.typography.bodySmall)
                                    }
                                }
                                item {
                                    SectionCard("Ready when you are", Icons.Outlined.CloudUpload) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Column(Modifier.weight(1f)) { Text("Wi-Fi only", style = MaterialTheme.typography.titleMedium); Text("Wait for unmetered Wi-Fi", style = MaterialTheme.typography.bodySmall) }
                                            Switch(wifi, onCheckedChange = { wifi = it; store.prefs.edit().putBoolean("wifi",it).apply() })
                                        }
                                        Text("Photos follow the gallery’s visibility. Existing photos are skipped. Nothing is deleted from your phone.", style = MaterialTheme.typography.bodyMedium)
                                        Button(onClick = {
                                            scope.launch {
                                                busy = true; scan = null; problem = null; scanned = 0
                                                try { scan = withContext(Dispatchers.IO) { PhotoScanner.scan(activity, folder, since) { count -> scope.launch { scanned = count } } } }
                                                catch (e: Exception) { problem = e.message ?: "Could not scan folder." }
                                                finally { busy = false }
                                            }
                                        }, enabled = folder.isNotBlank() && !busy && !queue.any { it.state in listOf("queued","uploading","failed") }, modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp)) {
                                            Icon(Icons.Outlined.Sync, null); Spacer(Modifier.width(10.dp)); Text(if(busy) "Checking $scanned photos…" else "Check for photos")
                                        }
                                        if(busy) LinearProgressIndicator(Modifier.fillMaxWidth())
                                        if(queue.any { it.state in listOf("queued","uploading","failed") }) TextButton(onClick = { tab = 1 }) { Text("Finish or clear the previous batch first") }
                                    }
                                }
                            }
                            item { TextButton(onClick = { activity.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("${store.prefs.getString("site", "")}/admin/galleries/"))) }) { Icon(Icons.Outlined.OpenInNew,null); Spacer(Modifier.width(8.dp)); Text("Open gallery dashboard") } }
                        }
                    }
                    1 -> {
                        item {
                            val done = queue.count { it.state == "uploaded" || it.state == "skipped" }
                            SectionCard(store.batch()?.third ?: "Your upload queue", Icons.Outlined.CloudUpload) {
                                Text("$done / ${queue.size}", style = MaterialTheme.typography.displayMedium, fontWeight = FontWeight.Bold)
                                Text(status, style = MaterialTheme.typography.bodyLarge)
                                if(queue.isNotEmpty()) {
                                    LinearProgressIndicator(progress = { done.toFloat()/queue.size }, modifier = Modifier.fillMaxWidth())
                                    Text("${queue.count { it.state == "uploaded" }} uploaded · ${queue.count { it.state == "skipped" }} skipped · ${queue.count { it.state == "failed" }} failed", style = MaterialTheme.typography.bodyMedium)
                                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                        if(scheduled) FilledTonalButton(onClick = { UploadJobService.pause(activity) }) { Icon(Icons.Outlined.Pause,null); Text("Pause") }
                                        else if(queue.any { it.state in listOf("queued","uploading","failed") }) Button(onClick = { store.retry(); schedule() }) { Icon(Icons.Outlined.PlayArrow,null); Text(if(queue.any { it.state == "failed" }) "Retry" else "Resume") }
                                        if(!scheduled) TextButton(onClick = { clearConfirm = true }) { Text("Clear batch") }
                                    }
                                } else TextButton(onClick = { tab = 0 }) { Text("Choose photos to upload") }
                            }
                        }
                        items(queue, key = { it.id }) { item ->
                            ListItem(headlineContent = { Text(item.name) }, supportingContent = { Text(item.error.ifBlank { item.state.replaceFirstChar(Char::uppercase) }) }, leadingContent = {
                                Icon(when(item.state) { "uploaded" -> Icons.Outlined.CheckCircle; "skipped" -> Icons.Outlined.DoneAll; "failed" -> Icons.Outlined.ErrorOutline; else -> Icons.Outlined.Schedule }, null)
                            }, colors = ListItemDefaults.colors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow), modifier = Modifier.fillMaxWidth())
                        }
                    }
                    2 -> {
                        item {
                            SectionCard(if(connected) "Website connected" else "Make the connection", Icons.Outlined.Link, "Create a pairing key in your gallery dashboard, then paste it here. Your computer is not needed.") {
                                OutlinedTextField(website, onValueChange = { website = it }, label = { Text("Website address") }, singleLine = true, modifier = Modifier.fillMaxWidth(), enabled = !busy && !store.hasPending())
                                OutlinedTextField(key, onValueChange = { key = it.trim() }, label = { Text("Pairing key") }, visualTransformation = PasswordVisualTransformation(), singleLine = true, modifier = Modifier.fillMaxWidth(), enabled = !busy)
                                TextButton(onClick = {
                                    try { activity.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("${SyncRules.site(website)}/admin/galleries/devices/"))) }
                                    catch (_: Exception) { problem = "Enter a valid HTTPS website address first." }
                                }) { Icon(Icons.Outlined.OpenInNew,null); Spacer(Modifier.width(8.dp)); Text("Get a pairing key") }
                                Button(onClick = {
                                    scope.launch {
                                        busy = true; problem = null
                                        try {
                                            val site = SyncRules.site(website)
                                            require(Regex("ayoub_[a-f0-9]{64}").matches(key)) { "Paste the complete pairing key from your dashboard." }
                                            val list = withContext(Dispatchers.IO) { GalleryApi.galleries(site, key) }
                                            store.saveConnection(site,key); key = ""; connected = true; galleries = list; tab = 0
                                        } catch (e: Exception) { problem = e.message ?: "Could not connect." }
                                        finally { busy = false }
                                    }
                                }, enabled = !busy && key.isNotBlank() && !scheduled, modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp)) { Text(if(busy) "Connecting…" else if(connected) "Update connection" else "Connect") }
                                if(store.hasPending()) Text("Finish or clear the current batch before changing websites.", style = MaterialTheme.typography.bodySmall)
                            }
                        }
                        item { SectionCard("Made for the field", Icons.Outlined.CameraAlt) {
                            Text("Choose a gallery, select your transfer folder, and publish a batch. The upload queue stays on your phone if a connection drops.")
                            Text("Photos are resized to 2400px for the website. Full-resolution originals stay with you.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text("Ayoub Gallery · 0.1.1 beta 1", style = MaterialTheme.typography.labelLarge)
                        } }
                    }
                }
            }
        }
    }
    scan?.let { result ->
        AlertDialog(onDismissRequest = { scan = null }, icon = { Icon(Icons.Outlined.PhotoLibrary,null) }, title = { Text("${result.photos.size} photos ready") }, text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("Upload to ${selected?.title}? Its visibility will stay unchanged.")
                Text("${result.photos.sumOf { it.size } / (1024*1024)} MB before resizing. Already uploaded photos will be skipped.")
                if(result.photos.any { it.fallback }) Text("${result.photos.count { it.fallback }} photos have no usable capture date. Their file date was used.")
                if(result.tooLarge + result.unreadable > 0) Text("Excluded: ${result.tooLarge} over 20 MB; ${result.unreadable} unreadable.")
                Text("This uploads only the photos found now. New arrivals wait for your next sync.")
            }
        }, confirmButton = { TextButton(onClick = {
            selected?.let { store.replaceBatch(store.prefs.getString("site", "")!!,it,result.photos); scan = null; schedule() }
        }, enabled = result.photos.isNotEmpty()) { Text("Sync photos") } }, dismissButton = { TextButton(onClick = { scan = null }) { Text("Cancel") } })
    }
    if(clearConfirm) AlertDialog(onDismissRequest = { clearConfirm = false }, title = { Text("Clear this batch?") }, text = { Text("Unfinished uploads will be removed from this phone’s queue. Published photos stay on the website. You can scan the folder again later.") }, confirmButton = { TextButton(onClick = { store.clearQueue(); queue = emptyList(); clearConfirm = false; store.message("No uploads yet.") }) { Text("Clear batch") } }, dismissButton = { TextButton(onClick = { clearConfirm = false }) { Text("Keep batch") } })
}
