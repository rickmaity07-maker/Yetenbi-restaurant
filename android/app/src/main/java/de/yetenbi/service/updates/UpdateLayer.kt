package de.yetenbi.service.updates

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.SystemUpdate
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import de.yetenbi.service.i18n.LocalStrings
import de.yetenbi.service.ui.AppViewModel
import de.yetenbi.service.ui.UiState
import de.yetenbi.service.ui.components.ButtonKind
import de.yetenbi.service.ui.components.LocalCompact
import de.yetenbi.service.ui.components.PillButton
import de.yetenbi.service.ui.components.Cross
import de.yetenbi.service.ui.theme.Yt

/*
  Sits on top of every screen:
    optional update  -> a small card bottom-right (install now / later)
    mandatory update -> covers the app until it's installed
    downloading, installing, permission, failure -> the full card with progress
*/
@Composable
fun UpdateLayer(state: UiState, vm: AppViewModel) {
    val update = state.update
    val release = when (update) {
        is UpdateState.Available -> update.release
        is UpdateState.Downloading -> update.release
        is UpdateState.Installing -> update.release
        is UpdateState.NeedsPermission -> update.release
        is UpdateState.Failed -> update.release
        UpdateState.Idle -> null
    } ?: return
    val mandatory = update is UpdateState.Available && update.mandatory
    val busy = update !is UpdateState.Available

    if (mandatory || busy) {
        Box(Modifier.fillMaxSize().background(Yt.Night.copy(alpha = if (mandatory) 0.96f else 0.7f)), contentAlignment = Alignment.Center) {
            UpdateCard(state, vm, release, mandatory, Modifier.padding(16.dp).widthIn(max = 560.dp).fillMaxWidth())
        }
    } else {
        // On a phone it sits above the bottom navigation, full width.
        val compact = LocalCompact.current
        Box(Modifier.fillMaxSize().navigationBarsPadding().padding(if (compact) 12.dp else 24.dp).padding(bottom = if (compact) 64.dp else 0.dp), contentAlignment = Alignment.BottomEnd) {
            AnimatedVisibility(!state.updateDismissed, enter = slideInVertically { it }, exit = slideOutVertically { it }) {
                UpdateCard(state, vm, release, mandatory = false, Modifier.widthIn(max = 420.dp).fillMaxWidth())
            }
        }
    }
}

@Composable
private fun UpdateCard(state: UiState, vm: AppViewModel, release: Release, mandatory: Boolean, modifier: Modifier) {
    val strings = LocalStrings.current
    val copy = strings.update
    val context = LocalContext.current
    val notes = if (strings.code == "en" && release.notesEn.isNotBlank()) release.notesEn else release.notes
    Surface(shape = RoundedCornerShape(28.dp), color = Yt.Coal, border = androidx.compose.foundation.BorderStroke(1.dp, Yt.Gold.copy(alpha = 0.4f)), shadowElevation = 12.dp, modifier = modifier.testTag("update-card")) {
        Column(Modifier.padding(24.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (mandatory) Cross(size = 40.dp) else Icon(Icons.Rounded.SystemUpdate, null, Modifier.size(32.dp), tint = Yt.Gold)
                Spacer(Modifier.width(14.dp))
                Column(Modifier.weight(1f)) {
                    Text(if (mandatory) copy.mandatoryTitle else copy.available(release.versionName), style = MaterialTheme.typography.headlineSmall)
                    Text(copy.current(vm.currentVersionName), style = MaterialTheme.typography.bodySmall, color = Yt.Sand)
                }
            }
            if (mandatory) {
                Spacer(Modifier.height(10.dp))
                Text(copy.mandatoryBody, style = MaterialTheme.typography.bodyMedium)
            }
            if (notes.isNotBlank()) {
                Spacer(Modifier.height(12.dp))
                Text(copy.whatsNew.uppercase(), style = MaterialTheme.typography.labelMedium, color = Yt.Gold)
                Text(notes, style = MaterialTheme.typography.bodyMedium, maxLines = 6)
            }
            Spacer(Modifier.height(18.dp))
            when (val u = state.update) {
                is UpdateState.Downloading -> {
                    Text(copy.downloading((u.progress * 100).toInt()), style = MaterialTheme.typography.titleSmall)
                    Spacer(Modifier.height(8.dp))
                    LinearProgressIndicator(progress = { u.progress }, color = Yt.Gold, trackColor = Yt.Ember, modifier = Modifier.fillMaxWidth().height(8.dp).testTag("update-progress"))
                }
                is UpdateState.Installing -> {
                    Text(copy.installing, style = MaterialTheme.typography.titleSmall)
                    Spacer(Modifier.height(8.dp))
                    LinearProgressIndicator(color = Yt.Gold, trackColor = Yt.Ember, modifier = Modifier.fillMaxWidth().height(8.dp))
                }
                is UpdateState.NeedsPermission -> {
                    Text(copy.permissionTitle, style = MaterialTheme.typography.titleSmall)
                    Text(copy.permissionBody, style = MaterialTheme.typography.bodyMedium, color = Yt.Sand)
                    Spacer(Modifier.height(12.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        PillButton(copy.openSettings, { context.startActivity(vm.updatePermissionIntent()) }, kind = ButtonKind.Secondary, modifier = Modifier.weight(1f))
                        PillButton(copy.install, { vm.installUpdate(release) }, modifier = Modifier.weight(1f), testTag = "update-install")
                    }
                }
                is UpdateState.Failed -> {
                    Text(copy.failed, style = MaterialTheme.typography.titleSmall, color = Yt.Coral)
                    Text(copy.reasons[u.reason] ?: u.reason, style = MaterialTheme.typography.bodyMedium, color = Yt.Sand)
                    Spacer(Modifier.height(12.dp))
                    PillButton(strings.common.retry, { vm.installUpdate(release) }, modifier = Modifier.fillMaxWidth(), testTag = "update-retry")
                }
                else -> Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    if (!mandatory) PillButton(copy.later, vm::dismissUpdate, kind = ButtonKind.Secondary, modifier = Modifier.weight(1f), testTag = "update-later")
                    PillButton(copy.install, { vm.installUpdate(release) }, modifier = Modifier.weight(1f), testTag = "update-install")
                }
            }
        }
    }
}
