package de.yetenbi.service.ui.check

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Block
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.CreditCard
import androidx.compose.material.icons.rounded.Payments
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.DialogProperties
import de.yetenbi.service.data.Check
import de.yetenbi.service.data.CheckItem
import de.yetenbi.service.data.DiningTable
import de.yetenbi.service.data.Dish
import de.yetenbi.service.data.ItemStatus
import de.yetenbi.service.data.Money
import de.yetenbi.service.data.PayMethod
import de.yetenbi.service.i18n.LocalStrings
import de.yetenbi.service.ui.components.ButtonKind
import de.yetenbi.service.ui.components.Chip
import de.yetenbi.service.ui.components.Divider
import de.yetenbi.service.ui.components.Eyebrow
import de.yetenbi.service.ui.components.Keypad
import de.yetenbi.service.ui.components.PillButton
import de.yetenbi.service.ui.components.Segmented
import de.yetenbi.service.ui.components.Stepper
import de.yetenbi.service.ui.components.applyKey
import de.yetenbi.service.ui.login.fieldColors
import de.yetenbi.service.ui.tables.TableGraphic
import de.yetenbi.service.ui.tables.TableState
import de.yetenbi.service.ui.theme.Cormorant
import de.yetenbi.service.ui.theme.Yt

private enum class Tip { None, RoundUp, Five, Ten, Custom }

/*
  Taking payment for the whole table: card or cash, an optional tip (round up, 5 %, 10 % or typed), and for cash the
  amount handed over with the change to give back.
*/
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun PayDialog(check: Check, onPay: (PayMethod, Int, Int?) -> Unit, onDismiss: () -> Unit) {
    val strings = LocalStrings.current
    val due = check.totalCents
    var method by remember { mutableStateOf(PayMethod.Card) }
    var tip by remember { mutableStateOf(Tip.None) }
    var customTip by remember { mutableStateOf("") }
    var given by remember { mutableStateOf("") }
    var typing by remember { mutableStateOf<String?>(null) } // "tip" or "given": which amount the keypad types
    val tipCents = when (tip) {
        Tip.None -> 0
        Tip.RoundUp -> Money.roundUp(due).let { if (it == due) due + 100 - due % 100 else it } - due
        Tip.Five -> Money.percent(due, 5)
        Tip.Ten -> Money.percent(due, 10)
        Tip.Custom -> Money.parse(customTip) ?: 0
    }
    val toPay = due + tipCents
    val givenCents = Money.parse(given)
    val enough = method == PayMethod.Card || givenCents == null || givenCents >= toPay

    AlertDialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false),
        containerColor = Yt.Coal,
        modifier = Modifier.widthIn(max = 520.dp).padding(16.dp),
        title = { Text(strings.pay.title(check.tableLabel), style = MaterialTheme.typography.headlineMedium, color = Yt.Cream) },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState())) {
                Segmented(listOf(PayMethod.Card to strings.pay.card, PayMethod.Cash to strings.pay.cash), method, { method = it; typing = null }, Modifier.fillMaxWidth(), testTagPrefix = "method")
                Spacer(Modifier.height(16.dp))
                Eyebrow(strings.pay.tip, color = Yt.Sand)
                Spacer(Modifier.height(6.dp))
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Chip(strings.pay.noTip, tip == Tip.None, { tip = Tip.None; typing = null })
                    Chip(strings.pay.roundUp, tip == Tip.RoundUp, { tip = Tip.RoundUp; typing = null })
                    Chip("5 %", tip == Tip.Five, { tip = Tip.Five; typing = null })
                    Chip("10 %", tip == Tip.Ten, { tip = Tip.Ten; typing = null })
                    Chip(if (tip == Tip.Custom && customTip.isNotBlank()) Money.format(tipCents, strings.code) else strings.pay.custom, tip == Tip.Custom, { tip = Tip.Custom; typing = "tip" })
                }
                Spacer(Modifier.height(16.dp))
                Divider()
                Spacer(Modifier.height(12.dp))
                Row(verticalAlignment = Alignment.Bottom) {
                    Column(Modifier.weight(1f)) {
                        Eyebrow(strings.pay.toPay, color = Yt.Sand)
                        if (tipCents > 0) Text("${Money.format(due, strings.code)} + ${Money.format(tipCents, strings.code)}", style = MaterialTheme.typography.bodySmall, color = Yt.Sand)
                    }
                    Text(Money.format(toPay, strings.code), fontFamily = Cormorant, fontWeight = FontWeight.Bold, fontSize = 40.sp, color = Yt.Cream, modifier = Modifier.testTag("to-pay"))
                }
                if (method == PayMethod.Cash) {
                    Spacer(Modifier.height(14.dp))
                    Eyebrow(strings.pay.given, color = Yt.Sand)
                    Spacer(Modifier.height(6.dp))
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Chip(strings.pay.exact, givenCents == toPay, { given = Money.plain(toPay, "en"); typing = null })
                        Money.likelyNotes(toPay).forEach { note ->
                            Chip(Money.format(note, strings.code), givenCents == note, { given = Money.plain(note, "en"); typing = null })
                        }
                        Chip(if (typing == "given") "…" else strings.pay.custom, typing == "given", { given = ""; typing = "given" })
                    }
                    if (givenCents != null) {
                        Spacer(Modifier.height(10.dp))
                        Text(
                            if (enough) strings.pay.change(Money.format(Money.change(givenCents, toPay), strings.code)) else strings.pay.tooLittle,
                            style = MaterialTheme.typography.headlineSmall,
                            color = if (enough) Yt.Ready else Yt.Coral,
                            modifier = Modifier.testTag("change"),
                        )
                    }
                }
                typing?.let { target ->
                    Spacer(Modifier.height(12.dp))
                    Text(
                        (if (target == "tip") customTip else given).ifEmpty { "0" }.replace('.', if (strings.code == "en") '.' else ',') + " €",
                        style = MaterialTheme.typography.headlineMedium, color = Yt.GoldSoft,
                    )
                    Spacer(Modifier.height(6.dp))
                    Keypad({ key -> if (target == "tip") customTip = applyKey(customTip, key) else given = applyKey(given, key) }, decimal = if (strings.code == "en") "." else ",")
                }
            }
        },
        confirmButton = {
            PillButton(
                strings.pay.confirm(Money.format(toPay, strings.code)),
                { onPay(method, tipCents, if (method == PayMethod.Cash) givenCents else null) },
                icon = if (method == PayMethod.Cash) Icons.Rounded.Payments else Icons.Rounded.CreditCard,
                enabled = enough && due > 0,
                testTag = "confirm-pay",
            )
        },
        dismissButton = { PillButton(strings.common.cancel, onDismiss, kind = ButtonKind.Ghost) },
    )
}

@Composable
fun GuestsDialog(current: Int, onSave: (Int) -> Unit, onDismiss: () -> Unit) {
    val strings = LocalStrings.current
    var guests by remember { mutableIntStateOf(current) }
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Yt.Coal,
        title = { Text(strings.check.changeGuests, style = MaterialTheme.typography.headlineSmall, color = Yt.Cream) },
        text = { Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) { Stepper(guests, { guests = it }, big = true, tag = "edit-guests") } },
        confirmButton = { PillButton(strings.common.save, { onSave(guests) }, testTag = "save-guests") },
        dismissButton = { PillButton(strings.common.cancel, onDismiss, kind = ButtonKind.Ghost) },
    )
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun MoveDialog(free: List<DiningTable>, onPick: (DiningTable) -> Unit, onDismiss: () -> Unit) {
    val strings = LocalStrings.current
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Yt.Coal,
        title = { Text(strings.check.moveTable, style = MaterialTheme.typography.headlineSmall, color = Yt.Cream) },
        text = {
            Column {
                Text(strings.check.moveHint, style = MaterialTheme.typography.bodyMedium, color = Yt.Sand)
                Spacer(Modifier.height(12.dp))
                FlowRow(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    free.forEach { table ->
                        androidx.compose.material3.Surface(onClick = { onPick(table) }, color = Yt.Ink, shape = MaterialTheme.shapes.large, modifier = Modifier.testTag("move-${table.label}")) {
                            TableGraphic(table.label, table.seats, 0, TableState.Free, Modifier.widthIn(max = 110.dp).padding(8.dp), numberSize = 26)
                        }
                    }
                }
            }
        },
        confirmButton = {},
        dismissButton = { PillButton(strings.common.cancel, onDismiss, kind = ButtonKind.Ghost) },
    )
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ReasonPicker(reasons: List<String>, reason: String, onReason: (String) -> Unit) {
    val strings = LocalStrings.current
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        reasons.forEach { r -> Chip(r, reason == r, { onReason(r) }) }
    }
    Spacer(Modifier.height(10.dp))
    OutlinedTextField(reason, { onReason(it.take(140)) }, label = { Text(strings.check.voidReason) }, singleLine = true, colors = fieldColors(), modifier = Modifier.fillMaxWidth().testTag("reason"))
}

@Composable
fun VoidCheckDialog(onVoid: (String) -> Unit, onDismiss: () -> Unit) {
    val strings = LocalStrings.current
    var reason by remember { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Yt.Coal,
        title = { Text(strings.check.voidCheck, style = MaterialTheme.typography.headlineSmall, color = Yt.Cream) },
        text = {
            Column {
                Text(strings.check.voidCheckHint, style = MaterialTheme.typography.bodyMedium, color = Yt.Sand)
                Spacer(Modifier.height(12.dp))
                ReasonPicker(strings.check.voidReasons, reason) { reason = it }
            }
        },
        confirmButton = { PillButton(strings.check.voidCheck, { onVoid(reason) }, kind = ButtonKind.Danger, icon = Icons.Rounded.Block, testTag = "confirm-void-check") },
        dismissButton = { PillButton(strings.common.cancel, onDismiss, kind = ButtonKind.Ghost) },
    )
}

/* Tapping a line on the bill: mark it served, or take it off with a reason. */
@Composable
fun ItemDialog(item: CheckItem, onServe: () -> Unit, onVoid: (String) -> Unit, onDismiss: () -> Unit) {
    val strings = LocalStrings.current
    var voiding by remember { mutableStateOf(false) }
    var reason by remember { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Yt.Coal,
        title = { Text("${item.qty}× ${item.name.of(strings.code)}", style = MaterialTheme.typography.headlineSmall, color = Yt.Cream) },
        text = {
            Column {
                if (item.note.isNotBlank()) Text("→ ${item.note}", color = Yt.Coral, style = MaterialTheme.typography.bodyMedium)
                Text("${Money.format(item.lineCents, strings.code)} · ${strings.check.by(item.addedBy)}", color = Yt.Sand, style = MaterialTheme.typography.bodySmall)
                if (voiding) {
                    Spacer(Modifier.height(14.dp))
                    ReasonPicker(strings.check.voidReasons, reason) { reason = it }
                }
            }
        },
        confirmButton = {
            if (voiding) PillButton(strings.check.voidItem, { onVoid(reason) }, kind = ButtonKind.Danger, enabled = reason.isNotBlank(), testTag = "confirm-void")
            else if (item.status != ItemStatus.SERVED) PillButton(strings.check.served, onServe, kind = ButtonKind.Ready, icon = Icons.Rounded.Check, testTag = "serve")
        },
        dismissButton = {
            Row {
                if (!voiding) PillButton(strings.check.voidItem, { voiding = true }, kind = ButtonKind.Danger, testTag = "void")
                PillButton(strings.common.cancel, onDismiss, kind = ButtonKind.Ghost)
            }
        },
    )
}

/* A wish for the kitchen ("extra scharf", "ohne Zwiebeln"): quick picks or typed. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun NoteDialog(dish: Dish, initial: String, onSave: (String) -> Unit, onDismiss: () -> Unit) {
    val strings = LocalStrings.current
    var note by remember { mutableStateOf(initial) }
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Yt.Coal,
        title = {
            Column {
                Eyebrow(strings.check.noteTitle)
                Text(dish.name.of(strings.code), style = MaterialTheme.typography.headlineSmall, color = Yt.Cream)
            }
        },
        text = {
            Column {
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    strings.check.noteSuggestions.forEach { s ->
                        Chip(s, note.contains(s), { note = if (note.contains(s)) note.replace(s, "").replace(Regex(",\\s*,"), ",").trim(' ', ',') else listOf(note, s).filter { it.isNotBlank() }.joinToString(", ") })
                    }
                }
                Spacer(Modifier.height(12.dp))
                OutlinedTextField(note, { note = it.take(140) }, placeholder = { Text(strings.check.notePlaceholder) }, colors = fieldColors(), modifier = Modifier.fillMaxWidth().testTag("note-field"))
            }
        },
        confirmButton = { PillButton(strings.common.save, { onSave(note) }, testTag = "save-note") },
        dismissButton = { PillButton(strings.common.cancel, onDismiss, kind = ButtonKind.Ghost) },
    )
}
