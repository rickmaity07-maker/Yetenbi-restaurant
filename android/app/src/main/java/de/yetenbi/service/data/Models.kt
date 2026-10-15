package de.yetenbi.service.data

import kotlinx.serialization.Serializable
import kotlin.math.roundToInt

/* The website's JSON (src/lib/service.ts and the /api/app routes), one to one. Money arrives in euros and is kept in cents. */

@Serializable
data class L(val de: String = "", val en: String = "", val am: String = "") {
    fun of(language: String) = if (language == "en" && en.isNotBlank()) en else de
}

@Serializable
data class User(val id: Long, val email: String, val name: String, val role: String, val locale: String = "de") {
    val isOwner get() = role == "owner"
}

@Serializable
data class LoginResponse(val token: String, val user: User)

@Serializable
data class DiningTable(val id: String, val label: String, val area: String = "", val seats: Int = 4)

@Serializable
data class Dish(
    val id: String,
    val name: L,
    val amharic: String = "",
    val description: L? = null,
    val price: Double,
    val tags: List<String> = emptyList(),
    val allergens: List<String> = emptyList(),
    val available: Boolean = true,
) {
    val priceCents get() = (price * 100).roundToInt()
}

@Serializable
data class Category(val id: String, val title: L, val drinks: Boolean = false, val items: List<Dish> = emptyList())

@Serializable
data class Bootstrap(
    val user: User,
    val tables: List<DiningTable> = emptyList(),
    val categories: List<Category> = emptyList(),
    val serverTime: String = "",
)

object ItemStatus {
    const val SENT = "sent"
    const val READY = "ready"
    const val SERVED = "served"
    const val VOID = "void"
}

@Serializable
data class CheckItem(
    val id: Long,
    val round: Int,
    val itemId: String,
    val name: L,
    val unit: Double,
    val qty: Int,
    val note: String = "",
    val kitchen: Boolean = true,
    val status: String,
    val voidReason: String = "",
    val addedBy: String = "",
    val createdAt: String = "",
    val readyAt: String? = null,
    val servedAt: String? = null,
) {
    val isVoid get() = status == ItemStatus.VOID
    val lineCents get() = if (isVoid) 0 else (unit * 100).roundToInt() * qty
}

@Serializable
data class Check(
    val id: Long,
    val number: Int,
    val tableId: String,
    val tableLabel: String,
    val guests: Int,
    val note: String = "",
    val status: String,
    val openedBy: String = "",
    val openedAt: String = "",
    val closedAt: String? = null,
    val closedBy: String = "",
    val payment: String? = null,
    val total: Double = 0.0,
    val tip: Double = 0.0,
    val given: Double? = null,
    val items: List<CheckItem> = emptyList(),
) {
    val isOpen get() = status == "open"
    val totalCents get() = if (isOpen) items.sumOf { it.lineCents } else (total * 100).roundToInt()
    val tipCents get() = (tip * 100).roundToInt()
    val ready get() = items.filter { it.kitchen && it.status == ItemStatus.READY }
    val readyCount get() = ready.sumOf { it.qty }
    val cookingCount get() = items.filter { it.kitchen && it.status == ItemStatus.SENT }.sumOf { it.qty }
    val rounds get() = items.groupBy { it.round }.toSortedMap()
}

@Serializable
data class DaySummary(
    val date: String = "",
    val paid: Int = 0,
    val voided: Int = 0,
    val total: Double = 0.0,
    val tips: Double = 0.0,
    val cash: Double = 0.0,
    val card: Double = 0.0,
    val guests: Int = 0,
)

@Serializable
data class CheckList(val checks: List<Check> = emptyList(), val summary: DaySummary? = null)

/* A line of the round being put together, before it is sent. Same dish with a different wish = separate line. */
data class RoundLine(val dish: Dish, val qty: Int, val note: String = "") {
    val key get() = "${dish.id}|$note"
}

enum class PayMethod(val wire: String) { Cash("cash"), Card("card") }
