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
import androidx.compose.material.icons.rounded.CreditCard
import androidx.compose.material.icons.rounded.Payments
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateMapOf
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
import de.yetenbi.service.data.Keys
import de.yetenbi.service.data.Money
import de.yetenbi.service.data.PayMethod
import de.yetenbi.service.data.PayPart
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
import de.yetenbi.service.ui.theme.Cormorant
import de.yetenbi.service.ui.theme.Yt

private enum class Tip { None, RoundUp, Five, Ten, Custom }
private enum class Split { Whole, Seat, Items, Equal }

/*
  Taking payment: the whole table, or one guest at a time (split bill) by seat, by dishes (also "1 of the 3 beers")
  or in equal shares. Card or cash, an optional tip (round up, 5 %, 10 % or typed), and for cash the amount handed
  over with the change. After a part the dialog stays open for the next guest; the last part closes the table.
  onPay(method, part, tip, given, key, done): done(true) once the table is settled.
*/
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun PayDialog(
    check: Check,
    onPay: (PayMethod, PayPart, Int, Int?, String, (Boolean) -> Unit) -> Unit,
    onDismiss: () -> Unit,
) {
    val strings = LocalStrings.current
    var split by remember { mutableStateOf(Split.Whole) }
    var method by remember { mutableStateOf(PayMethod.Card) }
    var tip by remember { mutableStateOf(Tip.None) }
    var customTip by remember { mutableStateOf("") }
    var given by remember { mutableStateOf("") }
    var typing by remember { mutableStateOf<String?>(null) } // "tip" or "given": which amount the keypad types
    var seat by remember { mutableStateOf<Int?>(null) }
    val picked = remember { mutableStateMapOf<Long, Int>() } // item id -> how many of it this guest pays
    var shares by remember { mutableIntStateOf(check.guests.coerceIn(2, 20)) }
    var sharesPaid by remember { mutableIntStateOf(0) }

    val due = check.dueCents
    val unpaid = check.unpaid
    val seats = unpaid.mapNotNull { it.seat }.distinct().sorted()
    val part: PayPart? = when (split) {
        Split.Whole -> PayPart(due)
        Split.Seat -> seat?.let { s ->
            val lines = unpaid.filter { it.seat == s }
            PayPart(lines.sumOf { it.unitCents * it.qty }, lines.map { it.id to it.qty }, strings.pay.seatLabel(s)).takeIf { lines.isNotEmpty() }
        }
        Split.Items -> unpaid.filter { (picked[it.id] ?: 0) > 0 }.takeIf { it.isNotEmpty() }?.let { lines ->
            PayPart(lines.sumOf { it.unitCents * picked[it.id]!! }, lines.map { it.id to picked[it.id]!! })
        }
        Split.Equal -> {
            val left = (shares - sharesPaid).coerceAtLeast(1)
            // Every share the same, the last one takes the cents left over.
            PayPart(if (left == 1) due else due / left, label = strings.pay.share(sharesPaid + 1, shares))
        }
    }
    val partCents = part?.amountCents ?: 0
    val tipCents = when (tip) {
        Tip.None -> 0
        Tip.RoundUp -> Money.roundUp(partCents).let { if (it == partCents) partCents + 100 - partCents % 100 else it } - partCents
        Tip.Five -> Money.percent(partCents, 5)
        Tip.Ten -> Money.percent(partCents, 10)
        Tip.Custom -> Money.parse(customTip) ?: 0
    }
    val toPay = partCents + tipCents
    val givenCents = Money.parse(given)
    val enough = method == PayMethod.Card || givenCents == null || givenCents >= toPay
    // A new key for each new payment; the same one when the same payment is retried after a dropped connection.
    val key = remember(check.payments.size, split, part) { Keys.new() }

    fun resetPart() {
        tip = Tip.None; customTip = ""; given = ""; typing = null; seat = null; picked.clear()
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false),
        containerColor = Yt.Coal,
        modifier = Modifier.widthIn(max = 560.dp).padding(16.dp),
        title = {
            Column {
                Text(strings.pay.title(check.tableLabel), style = MaterialTheme.typography.headlineMedium, color = Yt.Cream)
                if (check.payments.isNotEmpty()) Text(
                    "${strings.check.paidSoFar(Money.format(check.paidCents, strings.code))} · ${strings.check.stillDue} ${Money.format(due, strings.code)}",
                    style = MaterialTheme.typography.bodySmall, color = Yt.Ready,
                )
            }
        },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState())) {
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Chip(strings.pay.whole, split == Split.Whole, { split = Split.Whole; resetPart() }, Modifier.testTag("split-whole"))
                    if (seats.isNotEmpty()) Chip(strings.pay.bySeat, split == Split.Seat, { split = Split.Seat; resetPart() }, Modifier.testTag("split-seat"))
                    Chip(strings.pay.byItem, split == Split.Items, { split = Split.Items; resetPart() }, Modifier.testTag("split-items"))
                    Chip(strings.pay.equal, split == Split.Equal, { split = Split.Equal; resetPart() }, Modifier.testTag("split-equal"))
                }
                Spacer(Modifier.height(12.dp))
                when (split) {
                    Split.Whole -> Unit
                    Split.Seat -> {
                        Eyebrow(strings.pay.pickSeat, color = Yt.Sand)
                        Spacer(Modifier.height(6.dp))
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            seats.forEach { s -> Chip(strings.pay.seatLabel(s), seat == s, { seat = s }, Modifier.testTag("pay-seat-$s")) }
                        }
                        seat?.let { s -> unpaid.filter { it.seat == s }.forEach { item -> Line("${item.qty}× ${item.name.of(strings.code)}", item.unitCents * item.qty) } }
                    }
                    Split.Items -> {
                        Eyebrow(strings.pay.pickItems, color = Yt.Sand)
                        unpaid.forEach { item ->
                            Row(Modifier.fillMaxWidth().padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                                Column(Modifier.weight(1f)) {
                                    Text(item.name.of(strings.code), style = MaterialTheme.typography.bodyLarge, color = Yt.Cream, maxLines = 2)
                                    Text("${item.qty}× ${Money.format(item.unitCents, strings.code)}${item.seat?.let { " · ${strings.check.seat(it)}" } ?: ""}", style = MaterialTheme.typography.bodySmall, color = Yt.Sand)
                                }
                                Stepper(picked[item.id] ?: 0, { picked[item.id] = it }, min = 0, max = item.qty, tag = "pick-${item.id}")
                            }
                        }
                    }
                    Split.Equal -> {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(strings.pay.shares(shares), style = MaterialTheme.typography.titleMedium, color = Yt.Cream, modifier = Modifier.weight(1f))
                            Stepper(shares, { shares = it.coerceAtLeast(sharesPaid + 1) }, min = 2, max = 20, tag = "shares")
                        }
                        Text(strings.pay.share(sharesPaid + 1, shares), style = MaterialTheme.typography.bodySmall, color = Yt.Sand)
                    }
                }
                Spacer(Modifier.height(16.dp))
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
                        if (tipCents > 0) Text("${Money.format(partCents, strings.code)} + ${Money.format(tipCents, strings.code)}", style = MaterialTheme.typography.bodySmall, color = Yt.Sand)
                        if (part == null) Text(strings.pay.nothingPicked, style = MaterialTheme.typography.bodySmall, color = Yt.Coral)
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
                    Keypad({ k -> if (target == "tip") customTip = applyKey(customTip, k) else given = applyKey(given, k) }, decimal = if (strings.code == "en") "." else ",")
                }
            }
        },
        confirmButton = {
            PillButton(
                strings.pay.confirm(Money.format(toPay, strings.code)),
                {
                    val p = part ?: return@PillButton
                    onPay(method, p, tipCents, if (method == PayMethod.Cash) givenCents else null, key) { closed ->
                        if (!closed) {
                            if (split == Split.Equal) sharesPaid++
                            resetPart()
                        }
                    }
                },
                icon = if (method == PayMethod.Cash) Icons.Rounded.Payments else Icons.Rounded.CreditCard,
                enabled = enough && partCents > 0,
                big = true,
                testTag = "confirm-pay",
            )
        },
        dismissButton = { PillButton(strings.common.cancel, onDismiss, kind = ButtonKind.Ghost) },
    )
}

@Composable
private fun Line(text: String, cents: Int) {
    Row(Modifier.fillMaxWidth().padding(top = 6.dp)) {
        Text(text, style = MaterialTheme.typography.bodyMedium, color = Yt.Cream, modifier = Modifier.weight(1f))
        Text(Money.format(cents, LocalStrings.current.code), style = MaterialTheme.typography.bodyMedium, color = Yt.Cream)
    }
}
