package de.yetenbi.service.ui.tables

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.NotificationsActive
import androidx.compose.material.icons.rounded.Schedule
import androidx.compose.material.icons.rounded.SoupKitchen
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import de.yetenbi.service.data.Check
import de.yetenbi.service.data.DiningTable
import de.yetenbi.service.data.Times
import de.yetenbi.service.i18n.LocalStrings
import de.yetenbi.service.ui.AppViewModel
import de.yetenbi.service.ui.UiState
import de.yetenbi.service.ui.components.Eyebrow
import de.yetenbi.service.ui.components.LocalCompact
import de.yetenbi.service.ui.components.MoneyText
import de.yetenbi.service.ui.components.PillButton
import de.yetenbi.service.ui.components.ButtonKind
import de.yetenbi.service.ui.components.Stepper
import de.yetenbi.service.ui.components.Tilet
import de.yetenbi.service.ui.theme.Yt

fun stateOf(check: Check?) = when {
    check == null -> TableState.Free
    check.readyCount > 0 -> TableState.Ready
    else -> TableState.Taken
}

/* The dining room: every table as a drawing, taken ones with guests, time and the running bill. */
@Composable
fun TablesScreen(state: UiState, vm: AppViewModel) {
    val strings = LocalStrings.current
    val compact = LocalCompact.current
    val tables = state.tables
    val taken = tables.count { state.checkFor(it.id) != null }
    LazyVerticalGrid(
        columns = if (compact) GridCells.Fixed(2) else GridCells.Adaptive(240.dp),
        contentPadding = PaddingValues(if (compact) 14.dp else 28.dp),
        horizontalArrangement = Arrangement.spacedBy(if (compact) 12.dp else 20.dp),
        verticalArrangement = Arrangement.spacedBy(if (compact) 12.dp else 20.dp),
        modifier = Modifier.fillMaxSize().testTag("tables"),
    ) {
        item(span = { GridItemSpan(maxLineSpan) }) {
            Column(Modifier.padding(bottom = 6.dp)) {
                Eyebrow(Times.day(Times.today(), strings.code))
                Row(verticalAlignment = Alignment.Bottom) {
                    Text(strings.tables.title, style = if (compact) MaterialTheme.typography.displaySmall else MaterialTheme.typography.displayMedium, color = Yt.Cream, modifier = Modifier.weight(1f))
                    Text(strings.tables.occupied(taken, tables.size), style = MaterialTheme.typography.titleMedium, color = Yt.Sand, modifier = Modifier.padding(bottom = 8.dp))
                }
                Spacer(Modifier.height(8.dp))
                Tilet()
                Spacer(Modifier.height(12.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                    Legend(Yt.Sand.copy(alpha = 0.5f), strings.tables.legendFree)
                    Legend(Yt.Gold, strings.tables.legendBusy)
                    Legend(Yt.Ready, strings.tables.legendReady)
                }
            }
        }
        items(tables, key = { it.id }) { table -> TableTile(table, state.checkFor(table.id), onClick = { vm.tapTable(table) }) }
    }
}

@Composable
private fun Legend(color: Color, label: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(10.dp).background(color, CircleShape))
        Spacer(Modifier.width(6.dp))
        Text(label, style = MaterialTheme.typography.bodySmall, color = Yt.Sand)
    }
}

@Composable
fun TableTile(table: DiningTable, check: Check?, onClick: () -> Unit) {
    val strings = LocalStrings.current
    val compact = LocalCompact.current
    val tableState = stateOf(check)
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(22.dp),
        color = if (check == null) Yt.Ink else Yt.Coal,
        border = BorderStroke(
            if (tableState == TableState.Free) 1.dp else 1.5.dp,
            when (tableState) {
                TableState.Free -> Yt.Line
                TableState.Taken -> Yt.Gold.copy(alpha = 0.55f)
                TableState.Ready -> Yt.Ready
            },
        ),
        modifier = Modifier.fillMaxWidth().testTag("table-${table.label}"),
    ) {
        Column(Modifier.padding(if (compact) 12.dp else 18.dp)) {
            TableGraphic(
                label = table.label,
                seats = table.seats,
                guests = check?.guests ?: 0,
                state = tableState,
                numberSize = if (compact) 38 else 48,
                modifier = Modifier.fillMaxWidth().padding(horizontal = if (compact) 4.dp else 12.dp, vertical = 4.dp),
            )
            Spacer(Modifier.height(10.dp))
            if (check == null) {
                Text(strings.tables.free.replaceFirstChar { it.uppercase() }, style = MaterialTheme.typography.titleMedium, color = Yt.Sand)
                Text(strings.tables.seats(table.seats), style = MaterialTheme.typography.bodySmall, color = Yt.Sand.copy(alpha = 0.7f))
            } else {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(strings.common.guests(check.guests), style = MaterialTheme.typography.titleMedium, color = Yt.Cream, modifier = Modifier.weight(1f), maxLines = 1)
                    MoneyText(check.totalCents, color = Yt.GoldSoft, fontSize = if (compact) MaterialTheme.typography.titleMedium.fontSize else MaterialTheme.typography.titleLarge.fontSize)
                }
                Spacer(Modifier.height(6.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                    when {
                        check.readyCount > 0 -> Tag(Icons.Rounded.NotificationsActive, strings.tables.ready(check.readyCount), Yt.Ready, Yt.Ink)
                        check.cookingCount > 0 -> Tag(Icons.Rounded.SoupKitchen, strings.tables.cooking(check.cookingCount), Yt.Ember, Yt.GoldSoft)
                        else -> Tag(Icons.Rounded.Schedule, strings.common.minutes(Times.minutesSince(check.openedAt)), Yt.Ember, Yt.Sand)
                    }
                }
            }
        }
    }
}

@Composable
private fun Tag(icon: ImageVector, text: String, bg: Color, fg: Color) {
    Row(Modifier.background(bg, CircleShape).padding(horizontal = 9.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, contentDescription = null, tint = fg, modifier = Modifier.size(15.dp))
        Spacer(Modifier.width(5.dp))
        Text(text, style = MaterialTheme.typography.labelMedium.copy(letterSpacing = MaterialTheme.typography.bodySmall.letterSpacing), color = fg, maxLines = 1)
    }
}

/* "Open table 3": how many guests, shown live on the drawing, then straight to the menu. */
@Composable
fun OpenTableDialog(table: DiningTable, onOpen: (Int) -> Unit, onDismiss: () -> Unit) {
    val strings = LocalStrings.current
    var guests by remember(table.id) { mutableIntStateOf(minOf(2, table.seats)) }
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Yt.Coal,
        title = { Text(strings.tables.openTitle(table.label), style = MaterialTheme.typography.headlineMedium, color = Yt.Cream) },
        text = {
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                TableGraphic(table.label, maxOf(table.seats, guests), guests, TableState.Taken, Modifier.widthIn(max = 220.dp).fillMaxWidth())
                Spacer(Modifier.height(16.dp))
                Text(strings.tables.openHint, style = MaterialTheme.typography.bodyMedium, color = Yt.Sand, textAlign = TextAlign.Center)
                Spacer(Modifier.height(10.dp))
                Stepper(guests, { guests = it }, big = true, tag = "guests")
            }
        },
        confirmButton = { PillButton(strings.tables.open, { onOpen(guests) }, testTag = "open-table") },
        dismissButton = { PillButton(strings.common.cancel, onDismiss, kind = ButtonKind.Ghost) },
    )
}
