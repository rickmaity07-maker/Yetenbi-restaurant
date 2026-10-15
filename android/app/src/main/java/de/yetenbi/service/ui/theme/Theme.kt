package de.yetenbi.service.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import de.yetenbi.service.R

/* The website's tokens (src/app/globals.css): warm dark wood, gold, cream; the Ethiopian flag colours as accents. */
object Yt {
    val Night = Color(0xFF17120E)      // page background
    val Ink = Color(0xFF1C1712)
    val Coal = Color(0xFF27201A)       // cards
    val Ember = Color(0xFF352B21)      // raised cards, table tops
    val Wood = Color(0xFF4A3A2A)
    val Gold = Color(0xFFC9A24A)       // the accent
    val GoldSoft = Color(0xFFE7CD8A)
    val Cream = Color(0xFFF4ECDC)      // text
    val Sand = Color(0xFFB9AB92)       // muted text
    val Ready = Color(0xFF7FCF9C)      // food ready, paid
    val Coral = Color(0xFFF0A080)      // notes, warnings
    val EthGreen = Color(0xFF078930)
    val EthYellow = Color(0xFFFCDD09)
    val EthRed = Color(0xFFDA121A)
    val Line = Color(0x26C9A24A)       // gold at 15 %
}

private fun cormorant(weight: Int) = Font(R.font.cormorant, FontWeight(weight), variationSettings = FontVariation.Settings(FontVariation.weight(weight)))
private fun outfit(weight: Int) = Font(R.font.outfit, FontWeight(weight), variationSettings = FontVariation.Settings(FontVariation.weight(weight)))

val Cormorant = FontFamily(cormorant(500), cormorant(600), cormorant(700))
val Outfit = FontFamily(outfit(300), outfit(400), outfit(500), outfit(600), outfit(700))

private val typography = Typography(
    displayLarge = TextStyle(fontFamily = Cormorant, fontWeight = FontWeight.SemiBold, fontSize = 56.sp, lineHeight = 60.sp),
    displayMedium = TextStyle(fontFamily = Cormorant, fontWeight = FontWeight.SemiBold, fontSize = 42.sp, lineHeight = 46.sp),
    displaySmall = TextStyle(fontFamily = Cormorant, fontWeight = FontWeight.SemiBold, fontSize = 34.sp, lineHeight = 38.sp),
    headlineLarge = TextStyle(fontFamily = Cormorant, fontWeight = FontWeight.SemiBold, fontSize = 32.sp, lineHeight = 36.sp),
    headlineMedium = TextStyle(fontFamily = Cormorant, fontWeight = FontWeight.SemiBold, fontSize = 28.sp, lineHeight = 32.sp),
    headlineSmall = TextStyle(fontFamily = Cormorant, fontWeight = FontWeight.SemiBold, fontSize = 24.sp, lineHeight = 28.sp),
    titleLarge = TextStyle(fontFamily = Outfit, fontWeight = FontWeight.Medium, fontSize = 20.sp, lineHeight = 26.sp),
    titleMedium = TextStyle(fontFamily = Outfit, fontWeight = FontWeight.Medium, fontSize = 17.sp, lineHeight = 22.sp),
    titleSmall = TextStyle(fontFamily = Outfit, fontWeight = FontWeight.Medium, fontSize = 15.sp, lineHeight = 20.sp),
    bodyLarge = TextStyle(fontFamily = Outfit, fontSize = 17.sp, lineHeight = 24.sp),
    bodyMedium = TextStyle(fontFamily = Outfit, fontSize = 15.sp, lineHeight = 21.sp),
    bodySmall = TextStyle(fontFamily = Outfit, fontSize = 13.sp, lineHeight = 18.sp),
    labelLarge = TextStyle(fontFamily = Outfit, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, letterSpacing = 0.3.sp),
    labelMedium = TextStyle(fontFamily = Outfit, fontWeight = FontWeight.SemiBold, fontSize = 12.sp, letterSpacing = 2.4.sp),
    labelSmall = TextStyle(fontFamily = Outfit, fontWeight = FontWeight.SemiBold, fontSize = 11.sp, letterSpacing = 1.6.sp),
)

private val colors = darkColorScheme(
    primary = Yt.Gold,
    onPrimary = Yt.Ink,
    primaryContainer = Yt.Ember,
    onPrimaryContainer = Yt.GoldSoft,
    secondary = Yt.GoldSoft,
    onSecondary = Yt.Ink,
    tertiary = Yt.Ready,
    background = Yt.Night,
    onBackground = Yt.Cream,
    surface = Yt.Coal,
    onSurface = Yt.Cream,
    surfaceVariant = Yt.Ember,
    onSurfaceVariant = Yt.Sand,
    surfaceContainerLowest = Yt.Night,
    surfaceContainerLow = Yt.Ink,
    surfaceContainer = Yt.Coal,
    surfaceContainerHigh = Yt.Coal,
    surfaceContainerHighest = Yt.Ember,
    outline = Color(0x4DC9A24A),
    outlineVariant = Yt.Line,
    error = Yt.Coral,
    onError = Yt.Ink,
    inverseSurface = Yt.Cream,
    inverseOnSurface = Yt.Ink,
)

private val shapes = Shapes(
    extraSmall = RoundedCornerShape(6.dp),
    small = RoundedCornerShape(10.dp),
    medium = RoundedCornerShape(14.dp),
    large = RoundedCornerShape(20.dp),
    extraLarge = RoundedCornerShape(26.dp),
)

@Composable
fun YetenbiTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = colors, typography = typography, shapes = shapes, content = content)
}
