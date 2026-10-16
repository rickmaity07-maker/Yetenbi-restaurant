package de.yetenbi.service.ui.check

import android.content.Intent
import android.graphics.Bitmap
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Share
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.FilterQuality
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.qrcode.QRCodeWriter
import de.yetenbi.service.data.Check
import de.yetenbi.service.data.Money
import de.yetenbi.service.i18n.LocalStrings
import de.yetenbi.service.ui.components.ButtonKind
import de.yetenbi.service.ui.components.MoneyText
import de.yetenbi.service.ui.components.PillButton
import de.yetenbi.service.ui.tables.TableGraphic
import de.yetenbi.service.ui.tables.TableState
import de.yetenbi.service.ui.theme.Yt

/* "Tisch dazunehmen": pick the taken table that is pushed onto this one. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun MergeDialog(others: List<Check>, onPick: (Check) -> Unit, onDismiss: () -> Unit) {
    val strings = LocalStrings.current
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Yt.Coal,
        title = { Text(strings.check.mergeTable, style = MaterialTheme.typography.headlineSmall, color = Yt.Cream) },
        text = {
            Column {
                Text(if (others.isEmpty()) strings.check.noOtherTables else strings.check.mergeHint, style = MaterialTheme.typography.bodyMedium, color = Yt.Sand)
                Spacer(Modifier.height(12.dp))
                FlowRow(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    others.forEach { other ->
                        Surface(onClick = { onPick(other) }, color = Yt.Ink, shape = MaterialTheme.shapes.large, modifier = Modifier.testTag("merge-${other.tableLabel}")) {
                            Column(Modifier.padding(8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                TableGraphic(other.tableLabel, maxOf(4, other.guests), other.guests, TableState.Taken, Modifier.widthIn(max = 110.dp), numberSize = 26)
                                MoneyText(other.totalCents, color = Yt.GoldSoft, fontSize = MaterialTheme.typography.bodyMedium.fontSize)
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {},
        dismissButton = { PillButton(strings.common.cancel, onDismiss, kind = ButtonKind.Ghost) },
    )
}

/* A QR code drawn with ZXing: black squares on white, sharp at any size. */
private fun qr(text: String, size: Int = 512): Bitmap {
    val matrix = QRCodeWriter().encode(text, BarcodeFormat.QR_CODE, size, size, mapOf(EncodeHintType.MARGIN to 1))
    val pixels = IntArray(size * size) { i -> if (matrix[i % size, i / size]) 0xFF000000.toInt() else 0xFFFFFFFF.toInt() }
    return Bitmap.createBitmap(pixels, size, size, Bitmap.Config.ARGB_8888)
}

/* After paying: the guest scans the code and has their bill on the phone (/beleg/…), or the link is shared. */
@Composable
fun ReceiptDialog(check: Check, url: String, onDismiss: () -> Unit) {
    val strings = LocalStrings.current
    val context = LocalContext.current
    val image = remember(url) { qr(url).asImageBitmap() }
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Yt.Coal,
        title = {
            Column {
                Text(strings.pay.receipt, style = MaterialTheme.typography.headlineSmall, color = Yt.Cream)
                Text("${strings.check.table(check.tableLabel)} · ${Money.format(check.totalCents + check.tipCents, strings.code)}", style = MaterialTheme.typography.bodyMedium, color = Yt.Sand)
            }
        },
        text = {
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                Box(Modifier.background(androidx.compose.ui.graphics.Color.White, RoundedCornerShape(12.dp)).padding(10.dp)) {
                    Image(image, contentDescription = url, filterQuality = FilterQuality.None, modifier = Modifier.size(240.dp).testTag("receipt-qr"))
                }
                Spacer(Modifier.height(12.dp))
                Text(strings.pay.receiptHint, style = MaterialTheme.typography.bodyMedium, color = Yt.Sand, textAlign = TextAlign.Center)
            }
        },
        confirmButton = { PillButton(strings.pay.done, onDismiss, testTag = "receipt-done") },
        dismissButton = {
            PillButton(strings.pay.shareLink, {
                val send = Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, url)
                context.startActivity(Intent.createChooser(send, null))
            }, kind = ButtonKind.Secondary, icon = Icons.Rounded.Share)
        },
    )
}
