package xyz.ayoubabed.gallery

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import java.time.*

// Material pickers represent a calendar date at UTC midnight, not local midnight.
fun pickerDateMillis(date: LocalDate): Long = date.atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli()
fun pickerLocalDate(millis: Long): LocalDate = Instant.ofEpochMilli(millis).atZone(ZoneOffset.UTC).toLocalDate()

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GalleryDateDialog(initial: LocalDate, onDismiss: () -> Unit, onSelect: (LocalDate) -> Unit) {
    val state = rememberDatePickerState(initialSelectedDateMillis = pickerDateMillis(initial))
    DatePickerDialog(onDismissRequest = onDismiss,
        confirmButton = { TextButton(enabled = state.selectedDateMillis != null, onClick = { state.selectedDateMillis?.let { onSelect(pickerLocalDate(it)) } }) { Text("Continue") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }) {
        DatePicker(state, modifier = Modifier.verticalScroll(rememberScrollState()))
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GalleryTimeDialog(initial: LocalTime, onDismiss: () -> Unit, onSelect: (LocalTime) -> Unit) {
    val state = rememberTimePickerState(initialHour = initial.hour, initialMinute = initial.minute,
        is24Hour = android.text.format.DateFormat.is24HourFormat(LocalContext.current))
    var keyboard by remember { mutableStateOf(false) }
    AlertDialog(onDismissRequest = onDismiss, title = { Text("Choose time") },
        text = { Column(Modifier.verticalScroll(rememberScrollState())) {
            if (keyboard) TimeInput(state) else TimePicker(state)
            TextButton(onClick = { keyboard = !keyboard }) { Text(if (keyboard) "Use clock" else "Type time") }
        } },
        confirmButton = { TextButton(onClick = { onSelect(LocalTime.of(state.hour, state.minute)) }) { Text("Save") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } })
}
