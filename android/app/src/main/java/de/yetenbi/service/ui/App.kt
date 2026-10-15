package de.yetenbi.service.ui

import android.content.Intent
import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.WindowInsetsSides
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.only
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Insights
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.material.icons.rounded.TableRestaurant
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Snackbar
import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.yetenbi.service.i18n.LocalStrings
import de.yetenbi.service.ui.check.CheckScreen
import de.yetenbi.service.ui.components.Cross
import de.yetenbi.service.ui.components.FlagStripe
import de.yetenbi.service.ui.components.LocalCompact
import de.yetenbi.service.ui.components.OfflineBanner
import de.yetenbi.service.ui.login.LoginScreen
import de.yetenbi.service.ui.settings.SettingsScreen
import de.yetenbi.service.ui.tables.OpenTableDialog
import de.yetenbi.service.ui.tables.TablesScreen
import de.yetenbi.service.ui.theme.Cormorant
import de.yetenbi.service.ui.theme.Yt
import de.yetenbi.service.ui.today.TodayScreen
import de.yetenbi.service.updates.UpdateLayer
import kotlinx.coroutines.delay
import java.time.LocalTime
import java.time.format.DateTimeFormatter

@Composable
fun App(vm: AppViewModel) {
    val state by vm.state.collectAsStateWithLifecycle()
    val snackbar = remember { SnackbarHostState() }
    var lastError by remember { mutableStateOf(false) }
    val context = LocalContext.current

    LaunchedEffect(Unit) {
        vm.notices.collect { notice ->
            lastError = notice.error
            snackbar.showSnackbar(notice.text, withDismissAction = notice.error, duration = if (notice.error) SnackbarDuration.Long else SnackbarDuration.Short)
        }
    }

    BoxWithConstraints(Modifier.fillMaxSize()) {
        val compact = maxWidth < 600.dp
        CompositionLocalProvider(LocalStrings provides state.strings, LocalCompact provides compact) {
            Box(Modifier.fillMaxSize().background(Yt.Night)) {
                AnimatedContent(state.phase, transitionSpec = { fadeIn() togetherWith fadeOut() }, label = "phase") { phase ->
                    when (phase) {
                        Phase.Loading -> Box(Modifier.fillMaxSize().background(Yt.Night))
                        Phase.SignedOut -> LoginScreen(
                            state, vm::login,
                            onGoogle = { vm.googleStart { uri -> context.startActivity(Intent(Intent.ACTION_VIEW, uri)) } },
                            onLanguage = vm::setLanguage,
                        )
                        Phase.SignedIn -> Shell(state, vm)
                    }
                }
                state.opening?.let { table -> OpenTableDialog(table, onOpen = { vm.openTable(table, it) }, onDismiss = vm::cancelOpening) }
                // Updates sit above every screen, sign-in included: a mandatory one must be installable before anyone logs in.
                if (state.phase != Phase.Loading) UpdateLayer(state, vm)
                SnackbarHost(snackbar, Modifier.align(Alignment.TopCenter).padding(top = if (compact) 64.dp else 24.dp).testTag("snackbar")) { data ->
                    Snackbar(
                        data,
                        containerColor = if (lastError) Yt.Coral else Yt.Ready,
                        contentColor = Yt.Ink,
                        dismissActionContentColor = Yt.Ink,
                        shape = RoundedCornerShape(14.dp),
                    )
                }
            }
        }
    }
}

/*
  Tablet: a dark rail on the left with the cross, the screens and a clock; the current screen on the right.
  Phone: the screen on top, the same destinations in a bar along the bottom (hidden while a table is open).
*/
@Composable
private fun Shell(state: UiState, vm: AppViewModel) {
    if (LocalCompact.current) PhoneShell(state, vm) else TabletShell(state, vm)
}

@Composable
private fun CurrentScreen(state: UiState, vm: AppViewModel) {
    when (state.screen) {
        Screen.Tables -> if (state.selectedId != null) CheckScreen(state, vm) else TablesScreen(state, vm)
        Screen.Today -> TodayScreen(state, vm)
        Screen.Settings -> SettingsScreen(state, vm)
    }
}

@Composable
private fun BusyLine(state: UiState) {
    OfflineBanner(state.offline)
    Box(Modifier.height(2.dp).fillMaxWidth()) {
        if (state.busy) LinearProgressIndicator(Modifier.fillMaxSize(), color = Yt.Gold, trackColor = Color.Transparent)
    }
}

private fun readyTables(state: UiState) = state.checks.count { it.readyCount > 0 }

@Composable
private fun PhoneShell(state: UiState, vm: AppViewModel) {
    val strings = LocalStrings.current
    val inCheck = state.screen == Screen.Tables && state.selectedId != null
    BackHandler(enabled = state.screen != Screen.Tables) { vm.go(Screen.Tables) }
    Column(Modifier.fillMaxSize()) {
        Column(Modifier.weight(1f).windowInsetsPadding(WindowInsets.safeDrawing.only(WindowInsetsSides.Top + WindowInsetsSides.Horizontal + if (inCheck) WindowInsetsSides.Bottom else WindowInsetsSides.Top))) {
            BusyLine(state)
            Box(Modifier.weight(1f)) { CurrentScreen(state, vm) }
        }
        if (!inCheck) {
            FlagStripe(height = 2.dp)
            Row(Modifier.fillMaxWidth().background(Yt.Ink).navigationBarsPadding().padding(horizontal = 8.dp, vertical = 6.dp)) {
                BarItem(Icons.Rounded.TableRestaurant, strings.nav.tables, state.screen == Screen.Tables, badge = readyTables(state).takeIf { it > 0 }, tag = "nav-tables") { vm.go(Screen.Tables) }
                BarItem(Icons.Rounded.Insights, strings.nav.today, state.screen == Screen.Today, tag = "nav-today") { vm.go(Screen.Today) }
                BarItem(Icons.Rounded.Settings, strings.nav.settings, state.screen == Screen.Settings, tag = "nav-settings") { vm.go(Screen.Settings) }
            }
        }
    }
}

@Composable
private fun RowScope.BarItem(icon: ImageVector, label: String, selected: Boolean, badge: Int? = null, tag: String, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(16.dp),
        color = if (selected) Yt.Ember else Color.Transparent,
        contentColor = if (selected) Yt.GoldSoft else Yt.Cream.copy(alpha = 0.6f),
        modifier = Modifier.weight(1f).padding(horizontal = 4.dp).testTag(tag),
    ) {
        Column(Modifier.padding(vertical = 8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Box {
                Icon(icon, contentDescription = null, modifier = Modifier.size(24.dp))
                if (badge != null) Badge(badge, Modifier.align(Alignment.TopEnd).padding(start = 18.dp))
            }
            Spacer(Modifier.height(4.dp))
            Text(label, style = MaterialTheme.typography.labelSmall, maxLines = 1, letterSpacing = 0.4.sp)
        }
    }
}

@Composable
private fun Badge(count: Int, modifier: Modifier = Modifier) {
    Box(modifier.background(Yt.Ready, RoundedCornerShape(10.dp)).padding(horizontal = 5.dp)) {
        Text("$count", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Yt.Ink)
    }
}

@Composable
private fun TabletShell(state: UiState, vm: AppViewModel) {
    val strings = LocalStrings.current
    Row(Modifier.fillMaxSize()) {
        Column(
            Modifier.fillMaxHeight().width(104.dp).background(Yt.Ink).safeDrawingPadding().padding(vertical = 20.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Cross(size = 44.dp)
            Spacer(Modifier.height(6.dp))
            Text("YETENBI", style = MaterialTheme.typography.labelSmall, color = Yt.Gold.copy(alpha = 0.8f))
            Spacer(Modifier.height(28.dp))
            RailItem(Icons.Rounded.TableRestaurant, strings.nav.tables, state.screen == Screen.Tables, badge = readyTables(state).takeIf { it > 0 }, tag = "nav-tables") { vm.go(Screen.Tables); vm.selectCheck(null) }
            RailItem(Icons.Rounded.Insights, strings.nav.today, state.screen == Screen.Today, tag = "nav-today") { vm.go(Screen.Today) }
            Spacer(Modifier.weight(1f))
            Clock()
            Spacer(Modifier.height(16.dp))
            RailItem(Icons.Rounded.Settings, strings.nav.settings, state.screen == Screen.Settings, tag = "nav-settings") { vm.go(Screen.Settings) }
        }
        Box(Modifier.fillMaxHeight().width(1.dp).background(Yt.Line))
        Column(Modifier.weight(1f).fillMaxHeight()) {
            FlagStripe(height = 2.dp)
            BusyLine(state)
            Box(Modifier.weight(1f).safeDrawingPadding()) { CurrentScreen(state, vm) }
        }
    }
}

@Composable
private fun RailItem(icon: ImageVector, label: String, selected: Boolean, badge: Int? = null, tag: String, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(18.dp),
        color = if (selected) Yt.Ember else Color.Transparent,
        contentColor = if (selected) Yt.GoldSoft else Yt.Cream.copy(alpha = 0.6f),
        modifier = Modifier.padding(vertical = 4.dp).width(86.dp).testTag(tag),
    ) {
        Column(Modifier.padding(vertical = 12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Box {
                Icon(icon, contentDescription = null, modifier = Modifier.size(26.dp))
                if (badge != null) Badge(badge, Modifier.align(Alignment.TopEnd).padding(start = 20.dp))
            }
            Spacer(Modifier.height(6.dp))
            Text(label, style = MaterialTheme.typography.labelSmall, maxLines = 1, letterSpacing = 0.4.sp)
        }
    }
}

@Composable
private fun Clock() {
    var now by remember { mutableStateOf(LocalTime.now()) }
    LaunchedEffect(Unit) {
        while (true) {
            delay(1_000)
            now = LocalTime.now()
        }
    }
    Text(now.format(DateTimeFormatter.ofPattern("HH:mm")), fontFamily = Cormorant, color = Yt.Cream, fontSize = 26.sp, fontWeight = FontWeight.SemiBold)
}
