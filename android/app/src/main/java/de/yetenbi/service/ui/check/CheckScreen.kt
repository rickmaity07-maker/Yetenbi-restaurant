package de.yetenbi.service.ui.check

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.ui.draw.clip
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.automirrored.rounded.Send
import androidx.compose.material.icons.rounded.Block
import androidx.compose.material.icons.rounded.EditNote
import androidx.compose.material.icons.rounded.Groups
import androidx.compose.material.icons.rounded.LocalFireDepartment
import androidx.compose.material.icons.rounded.MoreVert
import androidx.compose.material.icons.rounded.NotificationsActive
import androidx.compose.material.icons.rounded.Payments
import androidx.compose.material.icons.rounded.Spa
import androidx.compose.material.icons.rounded.SwapHoriz
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.activity.compose.BackHandler
import de.yetenbi.service.data.Check
import de.yetenbi.service.data.CheckItem
import de.yetenbi.service.data.Dish
import de.yetenbi.service.data.ItemStatus
import de.yetenbi.service.data.Money
import de.yetenbi.service.data.RoundLine
import de.yetenbi.service.data.Times
import de.yetenbi.service.i18n.LocalStrings
import de.yetenbi.service.ui.AppViewModel
import de.yetenbi.service.ui.Pane
import de.yetenbi.service.ui.UiState
import de.yetenbi.service.ui.components.ButtonKind
import de.yetenbi.service.ui.components.Chip
import de.yetenbi.service.ui.components.Divider
import de.yetenbi.service.ui.components.EmptyState
import de.yetenbi.service.ui.components.Eyebrow
import de.yetenbi.service.ui.components.LocalCompact
import de.yetenbi.service.ui.components.MoneyText
import de.yetenbi.service.ui.components.Pill
import de.yetenbi.service.ui.components.PillButton
import de.yetenbi.service.ui.components.Segmented
import de.yetenbi.service.ui.components.Stepper
import de.yetenbi.service.ui.tables.TableGraphic
import de.yetenbi.service.ui.tables.stateOf
import de.yetenbi.service.ui.theme.Cormorant
import de.yetenbi.service.ui.theme.Yt

private enum class Dialog { None, Pay, Guests, Move, VoidCheck }

/*
  One table's check. Tablet: the bill on the left (ready food, what is being ordered, what was ordered, the total),
  the menu on the right. Phone: the same two panes behind a Bill / Menu switch.
*/
@Composable
fun CheckScreen(state: UiState, vm: AppViewModel) {
    val check = state.selected ?: return
    var dialog by remember { mutableStateOf(Dialog.None) }
    var itemFor by remember { mutableStateOf<CheckItem?>(null) }
    var noteFor by remember { mutableStateOf<RoundLine?>(null) }
    val compact = LocalCompact.current
    BackHandler { vm.selectCheck(null) }

    if (compact) {
        Column(Modifier.fillMaxSize()) {
            Header(check, vm, onDialog = { dialog = it })
            val strings = LocalStrings.current
            Segmented(
                listOf(Pane.Bill to strings.check.bill, Pane.Menu to if (state.roundCount > 0) "${strings.check.menu} · ${state.roundCount}" else strings.check.menu),
                state.pane, vm::setPane, Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 6.dp), testTagPrefix = "pane",
            )
            Box(Modifier.weight(1f)) {
                if (state.pane == Pane.Bill) BillPane(state, check, vm, onItem = { itemFor = it }, onNote = { noteFor = it }, onPay = { dialog = Dialog.Pay })
                else MenuPane(state, vm, onNote = { dish -> noteFor = RoundLine(dish, 0) })
            }
            if (state.pane == Pane.Menu && state.round.isNotEmpty()) SendBar(state, vm, onOpenRound = { vm.setPane(Pane.Bill) })
        }
    } else {
        Row(Modifier.fillMaxSize()) {
            Column(Modifier.width(420.dp).fillMaxHeight().background(Yt.Ink)) {
                Header(check, vm, onDialog = { dialog = it })
                Box(Modifier.weight(1f)) { BillPane(state, check, vm, onItem = { itemFor = it }, onNote = { noteFor = it }, onPay = { dialog = Dialog.Pay }) }
            }
            Box(Modifier.fillMaxHeight().width(1.dp).background(Yt.Line))
            Box(Modifier.weight(1f)) { MenuPane(state, vm, onNote = { dish -> noteFor = RoundLine(dish, 0) }) }
        }
    }

    when (dialog) {
        Dialog.Pay -> PayDialog(check, onPay = { method, tip, given -> vm.pay(method, tip, given) { dialog = Dialog.None } }, onDismiss = { dialog = Dialog.None })
        Dialog.Guests -> GuestsDialog(check.guests, onSave = { vm.setGuests(it); dialog = Dialog.None }, onDismiss = { dialog = Dialog.None })
        Dialog.Move -> MoveDialog(state.freeTables, onPick = { vm.moveTo(it); dialog = Dialog.None }, onDismiss = { dialog = Dialog.None })
        Dialog.VoidCheck -> VoidCheckDialog(onVoid = { vm.voidCheck(it); dialog = Dialog.None }, onDismiss = { dialog = Dialog.None })
        Dialog.None -> Unit
    }
    itemFor?.let { item -> ItemDialog(item, onServe = { vm.serveItem(item.id); itemFor = null }, onVoid = { vm.voidItem(item.id, it); itemFor = null }, onDismiss = { itemFor = null }) }
    noteFor?.let { line ->
        NoteDialog(
            dish = line.dish,
            initial = line.note,
            onSave = { note ->
                if (line.qty == 0) vm.addToRound(line.dish, note) else vm.setRoundNote(line.key, note)
                noteFor = null
            },
            onDismiss = { noteFor = null },
        )
    }
}

@Composable
private fun Header(check: Check, vm: AppViewModel, onDialog: (Dialog) -> Unit) {
    val strings = LocalStrings.current
    var menu by remember { mutableStateOf(false) }
    Row(Modifier.fillMaxWidth().padding(start = 4.dp, end = 4.dp, top = 8.dp, bottom = 4.dp), verticalAlignment = Alignment.CenterVertically) {
        IconButton(onClick = { vm.selectCheck(null) }, modifier = Modifier.testTag("back")) {
            Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = strings.common.back, tint = Yt.Cream)
        }
        TableGraphic(check.tableLabel, maxOf(4, check.guests), check.guests, stateOf(check), Modifier.height(46.dp), numberSize = 18)
        Spacer(Modifier.width(10.dp))
        Column(Modifier.weight(1f)) {
            Text(strings.check.table(check.tableLabel), style = MaterialTheme.typography.headlineMedium, color = Yt.Cream, maxLines = 1)
            Text(
                "${strings.common.guests(check.guests)} · ${strings.common.since(Times.clock(check.openedAt))}${if (check.openedBy.isNotBlank()) " · ${check.openedBy}" else ""}",
                style = MaterialTheme.typography.bodySmall, color = Yt.Sand, maxLines = 1, overflow = TextOverflow.Ellipsis,
            )
        }
        IconButton(onClick = { onDialog(Dialog.Guests) }, modifier = Modifier.testTag("guests")) { Icon(Icons.Rounded.Groups, strings.check.changeGuests, tint = Yt.GoldSoft) }
        Box {
            IconButton(onClick = { menu = true }, modifier = Modifier.testTag("check-more")) { Icon(Icons.Rounded.MoreVert, null, tint = Yt.Cream) }
            DropdownMenu(menu, { menu = false }, containerColor = Yt.Ember) {
                DropdownMenuItem({ Text(strings.check.moveTable) }, leadingIcon = { Icon(Icons.Rounded.SwapHoriz, null) }, onClick = { menu = false; onDialog(Dialog.Move) })
                DropdownMenuItem({ Text(strings.check.changeGuests) }, leadingIcon = { Icon(Icons.Rounded.Groups, null) }, onClick = { menu = false; onDialog(Dialog.Guests) })
                DropdownMenuItem({ Text(strings.check.voidCheck, color = Yt.Coral) }, leadingIcon = { Icon(Icons.Rounded.Block, null, tint = Yt.Coral) }, onClick = { menu = false; onDialog(Dialog.VoidCheck) })
            }
        }
    }
}

/* ---------- Bill ---------- */

@Composable
private fun BillPane(state: UiState, check: Check, vm: AppViewModel, onItem: (CheckItem) -> Unit, onNote: (RoundLine) -> Unit, onPay: () -> Unit) {
    val strings = LocalStrings.current
    Column(Modifier.fillMaxSize()) {
        LazyColumn(Modifier.weight(1f).fillMaxWidth(), contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp)) {
            if (check.readyCount > 0) item("ready") { ReadyBanner(check, onServed = { vm.serveReady() }) }
            if (state.round.isNotEmpty()) item("round") { RoundPanel(state, vm, onNote) }
            if (check.items.isEmpty() && state.round.isEmpty()) {
                item("empty") { Box(Modifier.heightIn(min = 280.dp)) { EmptyState(strings.check.emptyBill, strings.check.emptyBillHint) } }
            }
            check.rounds.entries.reversed().forEach { (round, items) ->
                item("r$round") {
                    Spacer(Modifier.height(14.dp))
                    Eyebrow(strings.check.round(round, Times.clock(items.first().createdAt)) + (items.first().addedBy.takeIf { it.isNotBlank() }?.let { " · $it" } ?: ""), color = Yt.Sand)
                    Spacer(Modifier.height(6.dp))
                }
                items(items, key = { it.id }) { item -> ItemRow(item, onClick = { if (!item.isVoid) onItem(item) }) }
            }
        }
        Divider()
        Column(Modifier.background(Yt.Ink).padding(16.dp)) {
            Row(verticalAlignment = Alignment.Bottom) {
                Column(Modifier.weight(1f)) {
                    Eyebrow(strings.common.total, color = Yt.Sand)
                    if (check.guests > 1 && check.totalCents > 0) Text(strings.check.perPerson(Money.format(check.totalCents / check.guests, strings.code)), style = MaterialTheme.typography.bodySmall, color = Yt.Sand)
                }
                Text(Money.format(check.totalCents, strings.code), fontFamily = Cormorant, fontWeight = FontWeight.Bold, fontSize = 36.sp, color = Yt.Cream, modifier = Modifier.testTag("check-total"))
            }
            Spacer(Modifier.height(10.dp))
            if (state.round.isNotEmpty()) SendButton(state, vm)
            else PillButton(strings.check.payButton(Money.format(check.totalCents, strings.code)), onPay, icon = Icons.Rounded.Payments, enabled = check.totalCents > 0, big = true, modifier = Modifier.fillMaxWidth(), testTag = "pay")
        }
    }
}

@Composable
private fun ReadyBanner(check: Check, onServed: () -> Unit) {
    val strings = LocalStrings.current
    Surface(shape = RoundedCornerShape(16.dp), color = Yt.Ready.copy(alpha = 0.14f), border = BorderStroke(1.dp, Yt.Ready), modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp).testTag("ready-banner")) {
        Column(Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Rounded.NotificationsActive, null, tint = Yt.Ready)
                Spacer(Modifier.width(8.dp))
                Text(strings.check.atPass, style = MaterialTheme.typography.titleMedium, color = Yt.Ready)
            }
            Spacer(Modifier.height(6.dp))
            check.ready.forEach { Text("${it.qty}× ${it.name.of(strings.code)}", style = MaterialTheme.typography.bodyLarge, color = Yt.Cream) }
            Spacer(Modifier.height(10.dp))
            PillButton(strings.check.allServed, onServed, kind = ButtonKind.Ready, modifier = Modifier.fillMaxWidth(), testTag = "all-served")
        }
    }
}

@Composable
private fun ItemRow(item: CheckItem, onClick: () -> Unit) {
    val strings = LocalStrings.current
    val (label, color) = when (item.status) {
        ItemStatus.SENT -> strings.check.statusSent to Yt.Gold
        ItemStatus.READY -> strings.check.statusReady to Yt.Ready
        ItemStatus.VOID -> strings.check.statusVoid to Yt.Coral
        else -> strings.check.statusServed to Yt.Sand.copy(alpha = 0.6f)
    }
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).clickable(onClick = onClick).padding(vertical = 8.dp, horizontal = 4.dp).testTag("item-${item.id}"),
        verticalAlignment = Alignment.Top,
    ) {
        Text("${item.qty}×", fontFamily = Cormorant, fontWeight = FontWeight.Bold, fontSize = 20.sp, color = if (item.isVoid) Yt.Sand.copy(alpha = 0.5f) else Yt.GoldSoft, modifier = Modifier.width(36.dp))
        Column(Modifier.weight(1f)) {
            Text(item.name.of(strings.code), style = MaterialTheme.typography.bodyLarge.copy(textDecoration = if (item.isVoid) androidx.compose.ui.text.style.TextDecoration.LineThrough else null), color = if (item.isVoid) Yt.Sand.copy(alpha = 0.6f) else Yt.Cream)
            if (item.note.isNotBlank()) Text("→ ${item.note}", style = MaterialTheme.typography.bodySmall, color = Yt.Coral)
            if (item.isVoid && item.voidReason.isNotBlank()) Text(item.voidReason, style = MaterialTheme.typography.bodySmall, color = Yt.Sand.copy(alpha = 0.6f))
            if (item.kitchen || item.isVoid) {
                Spacer(Modifier.height(3.dp))
                Pill(label, color.copy(alpha = 0.18f), onColor = color)
            }
        }
        MoneyText(item.lineCents.takeIf { !item.isVoid } ?: ((item.unit * 100).toInt() * item.qty), strike = item.isVoid, color = if (item.isVoid) Yt.Sand.copy(alpha = 0.5f) else Yt.Cream, fontSize = 16.sp)
    }
}

/* What is being ordered right now, before it goes to the kitchen. */
@Composable
private fun RoundPanel(state: UiState, vm: AppViewModel, onNote: (RoundLine) -> Unit) {
    val strings = LocalStrings.current
    Surface(shape = RoundedCornerShape(16.dp), color = Yt.Coal, border = BorderStroke(1.dp, Yt.Gold.copy(alpha = 0.5f)), modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp).testTag("round")) {
        Column(Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Eyebrow(strings.check.newRound, Modifier.weight(1f))
                MoneyText(state.roundCents, color = Yt.GoldSoft)
            }
            Spacer(Modifier.height(8.dp))
            state.round.forEach { line ->
                Row(Modifier.fillMaxWidth().padding(vertical = 5.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(line.dish.name.of(strings.code), style = MaterialTheme.typography.bodyLarge, color = Yt.Cream, maxLines = 2)
                        Surface(onClick = { onNote(line) }, shape = CircleShape, color = Color.Transparent, modifier = Modifier.testTag("note-${line.dish.id}")) {
                            Row(Modifier.padding(vertical = 2.dp), verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Rounded.EditNote, null, tint = if (line.note.isBlank()) Yt.Sand else Yt.Coral, modifier = Modifier.size(16.dp))
                                Spacer(Modifier.width(4.dp))
                                Text(line.note.ifBlank { strings.check.addNote }, style = MaterialTheme.typography.bodySmall, color = if (line.note.isBlank()) Yt.Sand else Yt.Coral)
                            }
                        }
                    }
                    Stepper(line.qty, { vm.changeRound(line.key, it - line.qty) }, min = 0, max = 99, tag = "round-${line.dish.id}")
                }
            }
        }
    }
}

@Composable
private fun SendButton(state: UiState, vm: AppViewModel) {
    val strings = LocalStrings.current
    val label = if (state.roundHasFood) strings.check.sendKitchen(state.roundCount) else strings.check.book(state.roundCount)
    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        PillButton(strings.common.cancel, vm::clearRound, kind = ButtonKind.Secondary)
        PillButton(label, vm::sendRound, icon = Icons.AutoMirrored.Rounded.Send, big = true, modifier = Modifier.weight(1f), testTag = "send")
    }
}

/* Phone, menu pane: what is in the round, and the send button, always in reach. */
@Composable
private fun SendBar(state: UiState, vm: AppViewModel, onOpenRound: () -> Unit) {
    val strings = LocalStrings.current
    Row(Modifier.fillMaxWidth().background(Yt.Ink).padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
        Surface(onClick = onOpenRound, shape = RoundedCornerShape(12.dp), color = Color.Transparent, modifier = Modifier.weight(1f)) {
            Column(Modifier.padding(4.dp)) {
                Text(state.round.joinToString(", ") { "${it.qty}× ${it.dish.name.of(strings.code)}" }, style = MaterialTheme.typography.bodySmall, color = Yt.Sand, maxLines = 1, overflow = TextOverflow.Ellipsis)
                MoneyText(state.roundCents, color = Yt.GoldSoft)
            }
        }
        Spacer(Modifier.width(10.dp))
        PillButton(if (state.roundHasFood) strings.check.sendKitchen(state.roundCount) else strings.check.book(state.roundCount), vm::sendRound, icon = Icons.AutoMirrored.Rounded.Send, testTag = "send-bar")
    }
}

/* ---------- Menu ---------- */

@Composable
private fun MenuPane(state: UiState, vm: AppViewModel, onNote: (Dish) -> Unit) {
    val strings = LocalStrings.current
    val compact = LocalCompact.current
    val categories = state.categories
    val shown = state.category?.let { id -> categories.filter { it.id == id } } ?: categories
    val inRound = state.round.groupBy { it.dish.id }.mapValues { (_, lines) -> lines.sumOf { it.qty } }
    Column(Modifier.fillMaxSize()) {
        Row(Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 14.dp, vertical = 10.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Chip(strings.check.all, state.category == null, { vm.setCategory(null) })
            categories.forEach { c -> Chip(c.title.of(strings.code), state.category == c.id, { vm.setCategory(c.id) }) }
        }
        LazyVerticalGrid(
            columns = GridCells.Adaptive(if (compact) 150.dp else 190.dp),
            contentPadding = PaddingValues(start = 14.dp, end = 14.dp, bottom = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
            modifier = Modifier.fillMaxSize().testTag("menu"),
        ) {
            shown.forEach { category ->
                item(key = "c-${category.id}", span = { androidx.compose.foundation.lazy.grid.GridItemSpan(maxLineSpan) }) {
                    Text(category.title.of(strings.code), style = MaterialTheme.typography.headlineSmall, color = Yt.GoldSoft, modifier = Modifier.padding(top = 8.dp))
                }
                items(category.items, key = { it.id }) { dish ->
                    DishTile(dish, inRound[dish.id] ?: 0, onAdd = { vm.addToRound(dish) }, onLong = { onNote(dish) })
                }
            }
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun DishTile(dish: Dish, count: Int, onAdd: () -> Unit, onLong: () -> Unit) {
    val strings = LocalStrings.current
    val chosen = count > 0
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = if (chosen) Yt.Ember else Yt.Coal,
        border = BorderStroke(if (chosen) 1.5.dp else 1.dp, if (chosen) Yt.Gold else Yt.Line),
        modifier = Modifier.fillMaxWidth().heightIn(min = 104.dp).combinedClickable(enabled = dish.available, onClick = onAdd, onLongClick = onLong).testTag("dish-${dish.id}"),
    ) {
        Box {
            Column(Modifier.padding(12.dp).then(if (dish.available) Modifier else Modifier.background(Color.Transparent))) {
                Text(dish.name.of(strings.code), style = MaterialTheme.typography.titleSmall, color = if (dish.available) Yt.Cream else Yt.Sand.copy(alpha = 0.5f), maxLines = 2, overflow = TextOverflow.Ellipsis)
                if (dish.amharic.isNotBlank()) Text(dish.amharic, style = MaterialTheme.typography.bodySmall, color = Yt.Sand.copy(alpha = if (dish.available) 0.8f else 0.4f), maxLines = 1)
                Spacer(Modifier.weight(1f, fill = false).height(8.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    MoneyText(dish.priceCents, color = if (dish.available) Yt.GoldSoft else Yt.Sand.copy(alpha = 0.5f), fontSize = 15.sp, modifier = Modifier.weight(1f))
                    if ("vegan" in dish.tags) Icon(Icons.Rounded.Spa, strings.check.vegan, tint = Yt.Ready, modifier = Modifier.size(16.dp))
                    if ("spicy" in dish.tags) Icon(Icons.Rounded.LocalFireDepartment, strings.check.spicy, tint = Yt.Coral, modifier = Modifier.size(16.dp))
                    if (!dish.available) Pill(strings.check.soldOut, Yt.Coral.copy(alpha = 0.2f), onColor = Yt.Coral)
                }
            }
            AnimatedVisibility(chosen, modifier = Modifier.align(Alignment.TopEnd).padding(6.dp)) {
                Box(Modifier.size(26.dp).background(Yt.Gold, CircleShape), contentAlignment = Alignment.Center) {
                    Text("$count", color = Yt.Ink, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                }
            }
        }
    }
}


