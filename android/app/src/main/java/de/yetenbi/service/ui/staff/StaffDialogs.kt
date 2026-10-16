package de.yetenbi.service.ui.staff

import android.graphics.Bitmap
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.Send
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.DialogProperties
import de.yetenbi.service.data.StaffMember
import de.yetenbi.service.i18n.LocalStrings
import de.yetenbi.service.ui.components.ButtonKind
import de.yetenbi.service.ui.components.Keypad
import de.yetenbi.service.ui.components.PillButton
import de.yetenbi.service.ui.login.fieldColors
import de.yetenbi.service.ui.theme.Cormorant
import de.yetenbi.service.ui.theme.Yt

/*
  "Wer bedient?": on a shared phone or tablet, the next waiter taps their name and types their PIN (set by the
  owners on the website under Team). Orders and payments then go under that name.
*/
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun StaffDialog(
    staff: List<StaffMember>?,
    onLoad: () -> Unit,
    onSwitch: (StaffMember, String, (String?) -> Unit) -> Unit,
    onDismiss: () -> Unit,
) {
    val strings = LocalStrings.current
    var chosen by remember { mutableStateOf<StaffMember?>(null) }
    var pin by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { onLoad() }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Yt.Coal,
        properties = DialogProperties(usePlatformDefaultWidth = false),
        modifier = Modifier.widthIn(max = 460.dp).padding(16.dp),
        title = { Text(chosen?.let { strings.staff.pin(it.name) } ?: strings.staff.title, style = MaterialTheme.typography.headlineSmall, color = Yt.Cream) },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState()), horizontalAlignment = Alignment.CenterHorizontally) {
                val person = chosen
                when {
                    person != null -> {
                        Text("•".repeat(pin.length).ifEmpty { "––––" }, fontFamily = Cormorant, style = MaterialTheme.typography.displaySmall, color = Yt.GoldSoft, modifier = Modifier.testTag("pin-dots"))
                        error?.let { Text(it, color = Yt.Coral, style = MaterialTheme.typography.bodyMedium) }
                        Spacer(Modifier.height(10.dp))
                        Keypad({ key ->
                            error = null
                            pin = when (key) {
                                "back" -> pin.dropLast(1)
                                "." -> pin
                                else -> if (pin.length < 6) pin + key else pin
                            }
                        }, decimal = " ")
                    }
                    staff == null -> CircularProgressIndicator(color = Yt.Gold)
                    staff.isEmpty() -> Text(strings.staff.none, color = Yt.Sand, textAlign = TextAlign.Center)
                    else -> {
                        Text(strings.staff.hint, color = Yt.Sand, style = MaterialTheme.typography.bodyMedium)
                        Spacer(Modifier.height(12.dp))
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            staff.forEach { member ->
                                Surface(onClick = { chosen = member; pin = ""; error = null }, color = Yt.Ember, shape = MaterialTheme.shapes.large, modifier = Modifier.heightIn(min = 56.dp).testTag("staff-${member.id}")) {
                                    Text(member.name, style = MaterialTheme.typography.titleMedium, color = Yt.Cream, modifier = Modifier.padding(horizontal = 18.dp, vertical = 16.dp))
                                }
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            val person = chosen
            if (person != null) PillButton(
                strings.common.save,
                {
                    busy = true
                    onSwitch(person, pin) { err ->
                        busy = false
                        if (err == null) onDismiss() else { error = err; pin = "" }
                    }
                },
                enabled = pin.length >= 4 && !busy, big = true, testTag = "pin-ok",
            )
        },
        dismissButton = {
            PillButton(if (chosen != null) strings.common.back else strings.common.cancel, { if (chosen != null) chosen = null else onDismiss() }, kind = ButtonKind.Ghost)
        },
    )
}

/* "Feedback": the tester writes what they noticed; a picture of the screen they were on goes along (optional). */
@Composable
fun FeedbackDialog(screenshot: Bitmap?, onSend: (String, Bitmap?, () -> Unit) -> Unit, onDismiss: () -> Unit) {
    val strings = LocalStrings.current
    var message by remember { mutableStateOf("") }
    var withPicture by remember { mutableStateOf(screenshot != null) }
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Yt.Coal,
        properties = DialogProperties(usePlatformDefaultWidth = false),
        modifier = Modifier.widthIn(max = 520.dp).padding(16.dp),
        title = { Text(strings.feedback.title, style = MaterialTheme.typography.headlineSmall, color = Yt.Cream) },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState())) {
                Text(strings.feedback.hint, color = Yt.Sand, style = MaterialTheme.typography.bodyMedium)
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(
                    message, { message = it.take(4000) }, placeholder = { Text(strings.feedback.placeholder) }, minLines = 4,
                    colors = fieldColors(), modifier = Modifier.fillMaxWidth().testTag("feedback-text"),
                )
                if (screenshot != null) {
                    Spacer(Modifier.height(12.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Image(screenshot.asImageBitmap(), null, modifier = Modifier.height(120.dp))
                        Spacer(Modifier.width(12.dp))
                        Text(strings.feedback.screenshot, color = Yt.Cream, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
                        Switch(
                            withPicture, { withPicture = it },
                            colors = SwitchDefaults.colors(checkedTrackColor = Yt.Gold, checkedThumbColor = Yt.Ink, uncheckedTrackColor = Yt.Ember, uncheckedThumbColor = Yt.Sand),
                        )
                    }
                }
            }
        },
        confirmButton = {
            PillButton(
                strings.feedback.send, { onSend(message, screenshot.takeIf { withPicture }, onDismiss) },
                icon = Icons.AutoMirrored.Rounded.Send, enabled = message.isNotBlank() || withPicture, testTag = "feedback-send",
            )
        },
        dismissButton = { PillButton(strings.common.cancel, onDismiss, kind = ButtonKind.Ghost) },
    )
}
