package de.yetenbi.service.ui.settings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.Logout
import androidx.compose.material.icons.rounded.SystemUpdate
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import de.yetenbi.service.BuildConfig
import de.yetenbi.service.i18n.LocalStrings
import de.yetenbi.service.ui.AppViewModel
import de.yetenbi.service.ui.UiState
import de.yetenbi.service.ui.components.ButtonKind
import de.yetenbi.service.ui.components.Card
import de.yetenbi.service.ui.components.Cross
import de.yetenbi.service.ui.components.Eyebrow
import de.yetenbi.service.ui.components.Hint
import de.yetenbi.service.ui.components.LocalCompact
import de.yetenbi.service.ui.components.PillButton
import de.yetenbi.service.ui.components.Segmented
import de.yetenbi.service.ui.theme.Yt

@Composable
fun SettingsScreen(state: UiState, vm: AppViewModel) {
    val strings = LocalStrings.current
    val user = state.user
    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(if (LocalCompact.current) 16.dp else 28.dp).widthIn(max = 640.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Text(strings.settings.title, style = MaterialTheme.typography.displaySmall, color = Yt.Cream)
        Card(Modifier.fillMaxWidth()) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Cross(size = 40.dp)
                Spacer(Modifier.width(14.dp))
                Column(Modifier.weight(1f)) {
                    Eyebrow(strings.settings.signedInAs, color = Yt.Sand)
                    Text(user?.name.orEmpty(), style = MaterialTheme.typography.titleLarge, color = Yt.Cream)
                    Text(user?.email.orEmpty(), style = MaterialTheme.typography.bodySmall, color = Yt.Sand)
                }
            }
        }
        Card(Modifier.fillMaxWidth()) {
            Column {
                Eyebrow(strings.settings.language, color = Yt.Sand)
                Spacer(Modifier.height(10.dp))
                Segmented(listOf("de" to "Deutsch", "en" to "English"), state.language, vm::setLanguage, Modifier.fillMaxWidth(), testTagPrefix = "lang")
            }
        }
        Card(Modifier.fillMaxWidth()) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(strings.settings.bell, style = MaterialTheme.typography.titleMedium, color = Yt.Cream)
                    Hint(strings.settings.bellHint)
                }
                Switch(
                    state.bell, vm::setBell, modifier = Modifier.testTag("bell"),
                    colors = SwitchDefaults.colors(checkedTrackColor = Yt.Gold, checkedThumbColor = Yt.Ink, uncheckedTrackColor = Yt.Ember, uncheckedThumbColor = Yt.Sand),
                )
            }
        }
        Card(Modifier.fillMaxWidth()) {
            Column {
                Text(strings.settings.version(BuildConfig.VERSION_NAME), style = MaterialTheme.typography.titleMedium, color = Yt.Cream)
                Hint("${strings.settings.server}: ${BuildConfig.API_URL.removePrefix("https://")}")
                Spacer(Modifier.height(12.dp))
                PillButton(strings.settings.checkUpdates, { vm.checkForUpdates() }, kind = ButtonKind.Secondary, icon = Icons.Rounded.SystemUpdate, testTag = "check-updates")
            }
        }
        PillButton(strings.settings.signOut, { vm.signOut() }, kind = ButtonKind.Danger, icon = Icons.AutoMirrored.Rounded.Logout, modifier = Modifier.fillMaxWidth(), testTag = "sign-out")
    }
}
