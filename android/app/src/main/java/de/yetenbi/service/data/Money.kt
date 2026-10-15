package de.yetenbi.service.data

import java.text.NumberFormat
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Currency
import java.util.Locale

val RESTAURANT_ZONE: ZoneId = ZoneId.of("Europe/Berlin")

/* Euro amounts the way each language writes them: 14,90 € in German, €14.90 in English. */
object Money {
    private fun format(locale: Locale) = NumberFormat.getCurrencyInstance(locale).apply { currency = Currency.getInstance("EUR") }
    private val de = format(Locale.GERMANY)
    private val en = format(Locale.UK)

    fun format(cents: Int, language: String): String = (if (language == "en") en else de).format(cents / 100.0)

    /* Plain number for keypads, without the € sign: "14,90" or "14.90". */
    fun plain(cents: Int, language: String): String {
        val whole = cents / 100
        val rest = (kotlin.math.abs(cents) % 100).toString().padStart(2, '0')
        return "$whole${if (language == "en") "." else ","}$rest"
    }

    /* Reads what staff type, accepting comma or dot: "4", "4,5", "4.50" -> cents. Null when it isn't an amount. */
    fun parse(input: String): Int? {
        val cleaned = input.trim().replace("€", "").replace(" ", "").replace(',', '.')
        if (cleaned.isEmpty()) return null
        if (!Regex("""^\d{1,5}(\.\d{0,2})?$""").matches(cleaned)) return null
        val parts = cleaned.split('.')
        val cents = parts.getOrNull(1)?.padEnd(2, '0')?.take(2)?.toIntOrNull() ?: 0
        return parts[0].toInt() * 100 + cents
    }

    /* Change to hand back for cash. */
    fun change(givenCents: Int, dueCents: Int) = (givenCents - dueCents).coerceAtLeast(0)

    /* "Make it round": the next whole euro above the amount (or the amount itself if already round). */
    fun roundUp(cents: Int) = if (cents % 100 == 0) cents else (cents / 100 + 1) * 100

    /* A tip as a share of the bill, rounded to 10 cents. */
    fun percent(cents: Int, percent: Int) = ((cents * percent / 100.0) / 10).let { kotlin.math.round(it).toInt() * 10 }

    /* Notes a guest is likely to hand over for this amount: the next 5, 10, 20, 50, 100. */
    fun likelyNotes(dueCents: Int): List<Int> =
        listOf(500, 1000, 2000, 5000, 10000).map { note -> ((dueCents + note - 1) / note) * note }.filter { it > dueCents }.distinct().take(3)
}

object Times {
    private val clock = DateTimeFormatter.ofPattern("HH:mm")

    fun clock(iso: String?): String = iso?.let { runCatching { clock.format(Instant.parse(it).atZone(RESTAURANT_ZONE)) }.getOrNull() } ?: ""

    fun today(): LocalDate = LocalDate.now(RESTAURANT_ZONE)

    fun minutesSince(iso: String?, now: Instant = Instant.now()): Long =
        iso?.let { runCatching { java.time.Duration.between(Instant.parse(it), now).toMinutes() }.getOrNull() } ?: 0

    fun day(date: LocalDate, language: String): String =
        DateTimeFormatter.ofPattern(if (language == "en") "EEEE, d MMMM" else "EEEE, d. MMMM", if (language == "en") Locale.UK else Locale.GERMANY).format(date)
}
