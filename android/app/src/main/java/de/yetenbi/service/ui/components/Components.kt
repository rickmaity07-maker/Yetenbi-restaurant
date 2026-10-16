package de.yetenbi.service.ui.components

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.automirrored.rounded.Backspace
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.CloudOff
import androidx.compose.material.icons.rounded.Remove
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import de.yetenbi.service.data.Money
import de.yetenbi.service.i18n.LocalStrings
import de.yetenbi.service.ui.theme.Cormorant
import de.yetenbi.service.ui.theme.Yt

/* True on a phone (narrower than 600 dp): screens show one pane at a time and stack what sits in rows. */
val LocalCompact = staticCompositionLocalOf { false }

/* The Lalibela cross from the website's icon, drawn so it stays crisp at any size. */
@Composable
fun Cross(modifier: Modifier = Modifier, size: Dp = 40.dp, color: Color = Yt.GoldSoft) {
    Canvas(modifier.size(size)) {
        scale(this.size.width / 32f, this.size.height / 32f, pivot = Offset.Zero) {
            val outer = Path().apply {
                moveTo(12f, 1.5f); lineTo(20f, 1.5f); lineTo(20f, 6.5f); lineTo(24f, 6.5f); lineTo(24f, 10.5f); lineTo(30.5f, 10.5f)
                lineTo(30.5f, 21.5f); lineTo(24f, 21.5f); lineTo(24f, 25.5f); lineTo(20f, 25.5f); lineTo(20f, 30.5f); lineTo(12f, 30.5f)
                lineTo(12f, 25.5f); lineTo(8f, 25.5f); lineTo(8f, 21.5f); lineTo(1.5f, 21.5f); lineTo(1.5f, 10.5f); lineTo(8f, 10.5f)
                lineTo(8f, 6.5f); lineTo(12f, 6.5f); close()
            }
            val inner = Path().apply {
                moveTo(13.8f, 5.5f); lineTo(18.2f, 5.5f); lineTo(18.2f, 13.8f); lineTo(26.5f, 13.8f); lineTo(26.5f, 18.2f); lineTo(18.2f, 18.2f)
                lineTo(18.2f, 26.5f); lineTo(13.8f, 26.5f); lineTo(13.8f, 18.2f); lineTo(5.5f, 18.2f); lineTo(5.5f, 13.8f); lineTo(13.8f, 13.8f); close()
            }
            drawPath(outer, color, style = Stroke(width = 1.6f, join = StrokeJoin.Round))
            drawPath(inner, color, style = Stroke(width = 1.1f, join = StrokeJoin.Round))
            drawRect(color, topLeft = Offset(14.6f, 14.6f), size = Size(2.8f, 2.8f))
        }
    }
}

/* Green, yellow, red: the thin flag stripe the website uses as a divider. */
@Composable
fun FlagStripe(modifier: Modifier = Modifier, height: Dp = 3.dp) {
    Row(modifier.fillMaxWidth().height(height)) {
        Box(Modifier.weight(1f).fillMaxSize().background(Yt.EthGreen))
        Box(Modifier.weight(1f).fillMaxSize().background(Yt.EthYellow))
        Box(Modifier.weight(1f).fillMaxSize().background(Yt.EthRed))
    }
}

/* The woven "tilet" zigzag from Ethiopian textiles (the website's .tilet band). */
@Composable
fun Tilet(modifier: Modifier = Modifier, color: Color = Yt.Gold.copy(alpha = 0.5f)) {
    Canvas(modifier.fillMaxWidth().height(10.dp)) {
        val step = 20.dp.toPx()
        val h = size.height
        val outer = Path()
        val inner = Path()
        var x = 0f
        outer.moveTo(0f, h)
        while (x < size.width) {
            outer.lineTo(x + step / 4, 0f); outer.lineTo(x + step / 2, h)
            inner.moveTo(x + step / 4, h); inner.lineTo(x + step / 2, h * 0.4f); inner.lineTo(x + step * 0.75f, h)
            x += step / 2
        }
        drawPath(outer, color, style = Stroke(width = 1.2.dp.toPx()))
        drawPath(inner, color.copy(alpha = color.alpha * 0.6f), style = Stroke(width = 0.8.dp.toPx()))
    }
}

@Composable
fun MoneyText(cents: Int, modifier: Modifier = Modifier, fontSize: TextUnit = 17.sp, color: Color = Yt.Cream, weight: FontWeight = FontWeight.Medium, strike: Boolean = false) {
    Text(
        Money.format(cents, LocalStrings.current.code),
        modifier = modifier,
        fontSize = fontSize,
        fontWeight = weight,
        color = color,
        maxLines = 1,
        style = MaterialTheme.typography.bodyLarge.copy(textDecoration = if (strike) TextDecoration.LineThrough else null),
    )
}

@Composable
fun Eyebrow(text: String, modifier: Modifier = Modifier, color: Color = Yt.Gold) {
    Text(text.uppercase(), modifier = modifier, style = MaterialTheme.typography.labelMedium, color = color, maxLines = 1)
}

enum class ButtonKind { Primary, Secondary, Ghost, Danger, Ready }

/* Pill buttons like the website's: gold for the main action, outlined for the rest. */
@Composable
fun PillButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    kind: ButtonKind = ButtonKind.Primary,
    icon: ImageVector? = null,
    enabled: Boolean = true,
    big: Boolean = false,
    testTag: String? = null,
) {
    val (bg, fg, border) = when (kind) {
        ButtonKind.Primary -> Triple(Yt.Gold, Yt.Ink, Color.Transparent)
        ButtonKind.Ready -> Triple(Yt.Ready, Yt.Ink, Color.Transparent)
        ButtonKind.Secondary -> Triple(Color.Transparent, Yt.Cream, Yt.Cream.copy(alpha = 0.3f))
        ButtonKind.Ghost -> Triple(Color.Transparent, Yt.GoldSoft, Color.Transparent)
        ButtonKind.Danger -> Triple(Color.Transparent, Yt.Coral, Yt.Coral.copy(alpha = 0.5f))
    }
    val alpha by animateFloatAsState(if (enabled) 1f else 0.4f, label = "alpha")
    Surface(
        onClick = onClick,
        enabled = enabled,
        shape = CircleShape,
        color = bg.copy(alpha = bg.alpha * alpha),
        contentColor = fg.copy(alpha = alpha),
        border = if (border.alpha > 0f) BorderStroke(1.dp, border) else null,
        modifier = modifier.then(if (testTag != null) Modifier.testTag(testTag) else Modifier),
    ) {
        Row(
            Modifier.padding(horizontal = if (big) 22.dp else 16.dp, vertical = if (big) 17.dp else 11.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center,
        ) {
            if (icon != null) {
                Icon(icon, contentDescription = null, modifier = Modifier.size(if (big) 22.dp else 18.dp))
                Spacer(Modifier.width(8.dp))
            }
            Text(text, style = if (big) MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold) else MaterialTheme.typography.labelLarge, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
    }
}

/* Segmented choice, e.g. bill/menu, cash/card, DE/EN. */
@Composable
fun <T> Segmented(options: List<Pair<T, String>>, selected: T, onSelect: (T) -> Unit, modifier: Modifier = Modifier, testTagPrefix: String = "seg") {
    Row(
        modifier.clip(CircleShape).background(Yt.Ink).padding(4.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        options.forEach { (value, label) ->
            val active = value == selected
            val bg by animateColorAsState(if (active) Yt.Gold else Color.Transparent, label = "seg")
            Box(
                Modifier
                    .weight(1f)
                    .clip(CircleShape)
                    .background(bg)
                    .clickable(role = Role.RadioButton) { onSelect(value) }
                    .testTag("$testTagPrefix-$value")
                    .padding(horizontal = 14.dp, vertical = 10.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(label, style = MaterialTheme.typography.labelLarge, color = if (active) Yt.Ink else Yt.Cream.copy(alpha = 0.75f), maxLines = 1)
            }
        }
    }
}

@Composable
fun Chip(text: String, selected: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier, count: Int? = null) {
    Surface(
        onClick = onClick,
        shape = CircleShape,
        color = if (selected) Yt.Gold else Color.Transparent,
        contentColor = if (selected) Yt.Ink else Yt.Cream,
        border = if (selected) null else BorderStroke(1.dp, Yt.Cream.copy(alpha = 0.2f)),
        modifier = modifier,
    ) {
        Row(Modifier.padding(horizontal = 14.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(text, style = MaterialTheme.typography.labelLarge, maxLines = 1)
            if (count != null) {
                Spacer(Modifier.width(6.dp))
                Text("$count", style = MaterialTheme.typography.labelLarge, color = if (selected) Yt.Ink.copy(alpha = 0.6f) else Yt.Sand)
            }
        }
    }
}

@Composable
fun Card(modifier: Modifier = Modifier, padding: PaddingValues = PaddingValues(20.dp), color: Color = Yt.Coal, border: Color = Yt.Line, content: @Composable () -> Unit) {
    Surface(modifier = modifier, shape = RoundedCornerShape(18.dp), color = color, border = BorderStroke(1.dp, border)) {
        Box(Modifier.padding(padding)) { content() }
    }
}

@Composable
fun EmptyState(title: String, hint: String, modifier: Modifier = Modifier) {
    Column(modifier.fillMaxSize().padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        Cross(size = 48.dp, color = Yt.Gold.copy(alpha = 0.7f))
        Spacer(Modifier.height(18.dp))
        Text(title, style = MaterialTheme.typography.headlineMedium, textAlign = TextAlign.Center, color = Yt.Cream)
        Spacer(Modifier.height(6.dp))
        Text(hint, style = MaterialTheme.typography.bodyMedium, textAlign = TextAlign.Center, color = Yt.Sand)
    }
}

@Composable
fun OfflineBanner(visible: Boolean) {
    AnimatedVisibility(visible, enter = expandVertically(), exit = shrinkVertically()) {
        Row(Modifier.fillMaxWidth().background(Yt.Coral).padding(horizontal = 20.dp, vertical = 10.dp).testTag("offline-banner"), verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Rounded.CloudOff, contentDescription = null, tint = Yt.Ink)
            Spacer(Modifier.width(10.dp))
            Text(LocalStrings.current.common.offline, color = Yt.Ink, style = MaterialTheme.typography.titleSmall)
        }
    }
}

/* Phone-only back arrow above a detail screen; the system back gesture does the same. */
@Composable
fun BackBar(onBack: () -> Unit, modifier: Modifier = Modifier, trailing: @Composable () -> Unit = {}) {
    BackHandler(onBack = onBack)
    Row(modifier.fillMaxWidth().padding(start = 4.dp, end = 8.dp, top = 4.dp), verticalAlignment = Alignment.CenterVertically) {
        IconButton(onClick = onBack, modifier = Modifier.testTag("back")) {
            Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = LocalStrings.current.common.back, tint = Yt.Cream)
        }
        Spacer(Modifier.weight(1f))
        trailing()
    }
}

/* − 3 + with thumb-sized buttons, for guests and quantities. */
@Composable
fun Stepper(value: Int, onChange: (Int) -> Unit, modifier: Modifier = Modifier, min: Int = 1, max: Int = 40, big: Boolean = false, tag: String = "stepper") {
    // At least 44 dp, so it is easy to hit with a thumb while carrying plates.
    val size = if (big) 56.dp else 44.dp
    Row(modifier, verticalAlignment = Alignment.CenterVertically) {
        Surface(onClick = { if (value > min) onChange(value - 1) }, enabled = value > min, shape = CircleShape, color = Yt.Ember, contentColor = Yt.Cream, modifier = Modifier.size(size).testTag("$tag-minus")) {
            Box(contentAlignment = Alignment.Center) { Icon(Icons.Rounded.Remove, contentDescription = "−") }
        }
        Text(
            "$value",
            fontFamily = Cormorant,
            fontWeight = FontWeight.SemiBold,
            fontSize = if (big) 44.sp else 22.sp,
            color = Yt.Cream,
            textAlign = TextAlign.Center,
            modifier = Modifier.width(if (big) 84.dp else 40.dp).testTag("$tag-value"),
        )
        Surface(onClick = { if (value < max) onChange(value + 1) }, enabled = value < max, shape = CircleShape, color = Yt.Gold, contentColor = Yt.Ink, modifier = Modifier.size(size).testTag("$tag-plus")) {
            Box(contentAlignment = Alignment.Center) { Icon(Icons.Rounded.Add, contentDescription = "+") }
        }
    }
}

/* Big-key number pad for amounts. */
@Composable
fun Keypad(onKey: (String) -> Unit, modifier: Modifier = Modifier, decimal: String = ",") {
    val rows = listOf(listOf("1", "2", "3"), listOf("4", "5", "6"), listOf("7", "8", "9"), listOf(decimal, "0", "⌫"))
    Column(modifier, verticalArrangement = Arrangement.spacedBy(6.dp)) {
        rows.forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                row.forEach { key ->
                    Surface(
                        onClick = { onKey(if (key == "⌫") "back" else if (key == decimal) "." else key) },
                        shape = RoundedCornerShape(12.dp),
                        color = Yt.Ember,
                        modifier = Modifier.weight(1f).aspectRatio(2.4f).testTag("key-$key"),
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            if (key == "⌫") Icon(Icons.AutoMirrored.Rounded.Backspace, contentDescription = "Delete", tint = Yt.Cream)
                            else Text(key, fontSize = 22.sp, fontWeight = FontWeight.Medium, color = Yt.Cream)
                        }
                    }
                }
            }
        }
    }
}

/* Applies one keypad press to an amount being typed, keeping at most two decimals. */
fun applyKey(current: String, key: String): String = when {
    key == "back" -> current.dropLast(1)
    key == "." -> if (current.contains('.')) current else (current.ifEmpty { "0" } + ".")
    current.contains('.') && current.substringAfter('.').length >= 2 -> current
    current == "0" -> key
    current.replace(".", "").length >= 6 -> current
    else -> current + key
}

@Composable
fun Stat(label: String, value: String, modifier: Modifier = Modifier, sub: String? = null, accent: Color = Yt.Cream) {
    Card(modifier, padding = PaddingValues(18.dp)) {
        Column {
            Eyebrow(label, color = Yt.Sand)
            Spacer(Modifier.height(8.dp))
            Text(value, style = MaterialTheme.typography.displaySmall, color = accent, maxLines = 1, softWrap = false)
            if (sub != null) Text(sub, style = MaterialTheme.typography.bodySmall, color = Yt.Sand)
        }
    }
}

@Composable
fun Divider(modifier: Modifier = Modifier) {
    Box(modifier.fillMaxWidth().height(1.dp).background(Yt.Line))
}

@Composable
fun Pill(text: String, color: Color, modifier: Modifier = Modifier, onColor: Color = Yt.Ink) {
    Box(modifier.clip(CircleShape).background(color).padding(horizontal = 9.dp, vertical = 3.dp)) {
        Text(text, style = MaterialTheme.typography.labelSmall.copy(letterSpacing = 0.6.sp), color = onColor, maxLines = 1)
    }
}

@Composable
fun Hint(text: String, modifier: Modifier = Modifier) {
    Text(text, modifier = modifier, style = MaterialTheme.typography.bodySmall, color = Yt.Sand)
}

