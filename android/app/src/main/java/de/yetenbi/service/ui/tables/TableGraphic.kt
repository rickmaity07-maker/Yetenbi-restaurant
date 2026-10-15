package de.yetenbi.service.ui.tables

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import de.yetenbi.service.ui.theme.Cormorant
import de.yetenbi.service.ui.theme.Yt
import kotlin.math.max
import kotlin.math.min

enum class TableState { Free, Taken, Ready }

private enum class Side { Top, Bottom, Left, Right }

private data class Seat(val side: Side, val index: Int, val ofSide: Int)

/*
  Where the chairs go: one at each end once there are three or more seats, the rest shared along the long sides.
  2 seats: face to face. 4: one per side. 6: two above, two below, one at each end.
*/
private fun seatsFor(count: Int): List<Seat> {
    val n = count.coerceIn(1, 12)
    val ends = if (n >= 3) 1 else 0
    val rest = n - ends * 2
    val top = (rest + 1) / 2
    val bottom = rest - top
    // Seated guests fill the chairs in this order: around the table, not one side first.
    val seats = mutableListOf<Seat>()
    val longest = max(top, bottom)
    for (i in 0 until longest) {
        if (i < top) seats += Seat(Side.Top, i, top)
        if (i < bottom) seats += Seat(Side.Bottom, i, bottom)
        if (i == 0 && ends == 1) {
            seats += Seat(Side.Left, 0, 1)
            seats += Seat(Side.Right, 0, 1)
        }
    }
    return seats
}

/* How wide the drawing is compared to its height: a long table for many seats. */
fun tableAspect(seats: Int): Float {
    val perSide = (seatsFor(seats).count { it.side == Side.Top }).coerceAtLeast(1)
    return (0.75f + perSide * 0.35f).coerceIn(1f, 2.2f)
}

/*
  A restaurant table seen from above: chairs around it (one per seat), a wooden top with a gold rim, a plate in front of
  every seated guest and the table number in the middle. Taken tables glow warm; when the kitchen has food ready for
  them they pulse green.
*/
@Composable
fun TableGraphic(
    label: String,
    seats: Int,
    guests: Int,
    state: TableState,
    modifier: Modifier = Modifier,
    numberSize: Int = 44,
) {
    val pulse = if (state == TableState.Ready) {
        rememberInfiniteTransition(label = "ready").animateFloat(0.25f, 0.85f, infiniteRepeatable(tween(900), RepeatMode.Reverse), label = "glow").value
    } else 0f
    val layout = seatsFor(seats)
    Box(modifier.aspectRatio(tableAspect(seats)), contentAlignment = Alignment.Center) {
        Canvas(Modifier.fillMaxSize()) { drawTable(layout, guests, state, pulse) }
        Text(
            label,
            fontFamily = Cormorant,
            fontWeight = FontWeight.Bold,
            fontSize = (if (label.length > 3) numberSize * 0.6f else numberSize.toFloat()).sp,
            color = when (state) {
                TableState.Free -> Yt.Cream.copy(alpha = 0.75f)
                TableState.Taken -> Yt.GoldSoft
                TableState.Ready -> Yt.Ready
            },
            textAlign = TextAlign.Center,
            maxLines = 1,
        )
    }
}

private fun DrawScope.drawTable(layout: List<Seat>, guests: Int, state: TableState, pulse: Float) {
    val w = size.width
    val h = size.height
    val unit = min(w, h)
    val chairDepth = unit * 0.13f
    val gap = unit * 0.035f
    val hasEnds = layout.any { it.side == Side.Left }
    val top = Rect(
        left = if (hasEnds) chairDepth + gap else unit * 0.08f,
        top = chairDepth + gap,
        right = w - if (hasEnds) chairDepth + gap else unit * 0.08f,
        bottom = h - chairDepth - gap,
    )
    val radius = CornerRadius(unit * 0.07f)
    val taken = state != TableState.Free

    // Chairs first, so the table top overlaps their front edge a little.
    layout.forEachIndexed { i, seat ->
        val seated = i < guests
        val chair = chairRect(seat, top, chairDepth, gap, unit)
        val fill = when {
            seated && state == TableState.Ready -> Yt.Ready.copy(alpha = 0.85f)
            seated -> Yt.GoldSoft.copy(alpha = 0.85f)
            else -> Yt.Coal
        }
        drawRoundRect(fill, chair.topLeft, chair.size, CornerRadius(unit * 0.04f))
        drawRoundRect(
            if (seated) Color.Transparent else Yt.Sand.copy(alpha = 0.35f),
            chair.topLeft, chair.size, CornerRadius(unit * 0.04f), style = Stroke(width = unit * 0.012f),
        )
        // The backrest: a darker bar on the side away from the table.
        val back = backrest(seat, chair, unit)
        drawRoundRect(if (seated) Yt.Ink.copy(alpha = 0.35f) else Yt.Sand.copy(alpha = 0.18f), back.topLeft, back.size, CornerRadius(unit * 0.02f))
    }

    // Green glow around a table whose food is waiting at the pass.
    if (state == TableState.Ready) {
        val spread = unit * 0.035f
        drawRoundRect(
            Yt.Ready.copy(alpha = pulse * 0.5f),
            Offset(top.left - spread, top.top - spread),
            Size(top.width + spread * 2, top.height + spread * 2),
            CornerRadius(radius.x + spread),
            style = Stroke(width = spread * 1.4f),
        )
    }

    // The top: dark wood when free, warm wood when taken, gold rim.
    val wood = if (taken) Brush.linearGradient(listOf(Color(0xFF5A4532), Color(0xFF3E2F21)), top.topLeft, top.bottomRight)
    else Brush.linearGradient(listOf(Yt.Ember, Color(0xFF2C241C)), top.topLeft, top.bottomRight)
    drawRoundRect(wood, top.topLeft, top.size, radius)
    // Grain: a few faint lines along the table.
    val grain = Yt.Cream.copy(alpha = if (taken) 0.06f else 0.035f)
    for (k in 1..4) {
        val y = top.top + top.height * k / 5f
        drawLine(grain, Offset(top.left + unit * 0.05f, y), Offset(top.right - unit * 0.05f, y + unit * 0.01f), strokeWidth = unit * 0.006f)
    }
    drawRoundRect(
        when (state) {
            TableState.Free -> Yt.Gold.copy(alpha = 0.35f)
            TableState.Taken -> Yt.Gold
            TableState.Ready -> Yt.Ready
        },
        top.topLeft, top.size, radius, style = Stroke(width = unit * if (taken) 0.022f else 0.014f),
    )

    // A plate in front of every seated guest.
    layout.take(guests).forEach { seat ->
        val plate = platePosition(seat, top, unit)
        val r = unit * 0.06f
        drawCircle(Yt.Cream.copy(alpha = 0.9f), r, plate)
        drawCircle(Yt.Gold.copy(alpha = 0.7f), r * 0.72f, plate, style = Stroke(width = unit * 0.008f))
    }
}

private fun chairRect(seat: Seat, top: Rect, depth: Float, gap: Float, unit: Float): Rect {
    val chairLong = unit * 0.2f
    return when (seat.side) {
        Side.Top, Side.Bottom -> {
            val slot = top.width / seat.ofSide
            val cx = top.left + slot * (seat.index + 0.5f)
            val y = if (seat.side == Side.Top) top.top - gap - depth else top.bottom + gap
            Rect(cx - chairLong / 2, y, cx + chairLong / 2, y + depth)
        }
        Side.Left, Side.Right -> {
            val cy = top.center.y
            val x = if (seat.side == Side.Left) top.left - gap - depth else top.right + gap
            Rect(x, cy - chairLong / 2, x + depth, cy + chairLong / 2)
        }
    }
}

private fun backrest(seat: Seat, chair: Rect, unit: Float): Rect {
    val t = unit * 0.035f
    return when (seat.side) {
        Side.Top -> Rect(chair.left, chair.top, chair.right, chair.top + t)
        Side.Bottom -> Rect(chair.left, chair.bottom - t, chair.right, chair.bottom)
        Side.Left -> Rect(chair.left, chair.top, chair.left + t, chair.bottom)
        Side.Right -> Rect(chair.right - t, chair.top, chair.right, chair.bottom)
    }
}

private fun platePosition(seat: Seat, top: Rect, unit: Float): Offset {
    val inset = unit * 0.1f
    return when (seat.side) {
        Side.Top -> Offset(top.left + top.width / seat.ofSide * (seat.index + 0.5f), top.top + inset)
        Side.Bottom -> Offset(top.left + top.width / seat.ofSide * (seat.index + 0.5f), top.bottom - inset)
        Side.Left -> Offset(top.left + inset, top.center.y)
        Side.Right -> Offset(top.right - inset, top.center.y)
    }
}
