package de.yetenbi.service

import de.yetenbi.service.alerts.ReadyWatch
import de.yetenbi.service.data.Check
import de.yetenbi.service.data.CheckItem
import de.yetenbi.service.data.L
import de.yetenbi.service.data.Payment
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ReadyWatchTest {
    private fun item(id: Long, status: String, seat: Int? = null, paid: Long? = null) =
        CheckItem(id = id, round = 1, itemId = "d$id", name = L("Dish $id"), unit = 10.0, qty = 1, status = status, seat = seat, paymentId = paid)

    private fun check(vararg items: CheckItem, payments: List<Payment> = emptyList()) =
        Check(id = 1, number = 1, tableId = "t1", tableLabel = "1", guests = 2, status = "open", items = items.toList(), payments = payments)

    @Test fun firstLookOnlyLearns() {
        val watch = ReadyWatch()
        assertTrue(watch.fresh(listOf(check(item(1, "ready")))).isEmpty())
    }

    @Test fun eachDishRingsOnceWhoeverLooks() {
        val watch = ReadyWatch()
        watch.fresh(listOf(check(item(1, "sent"))))
        // The app and the background service both look; only the first gets it.
        assertEquals(1, watch.fresh(listOf(check(item(1, "ready")))).size)
        assertTrue(watch.fresh(listOf(check(item(1, "ready")))).isEmpty())
        // Served and still on the check: no second ring.
        assertTrue(watch.fresh(listOf(check(item(1, "served")))).isEmpty())
    }

    @Test fun seenOnScreenNeedsNoBell() {
        val watch = ReadyWatch()
        watch.fresh(listOf(check(item(1, "sent"))))
        watch.seen(check(item(1, "ready")))
        assertTrue(watch.fresh(listOf(check(item(1, "ready")))).isEmpty())
    }

    @Test fun splitBillDueAndSeats() {
        val c = check(item(1, "served", seat = 1, paid = 7), item(2, "served", seat = 2), item(3, "void", seat = 2),
            payments = listOf(Payment(id = 7, method = "card", amount = 10.0)))
        assertEquals(2000, c.totalCents)
        assertEquals(1000, c.dueCents)
        assertEquals(listOf(1, 2), c.seats)
        assertEquals(listOf(2L), c.unpaid.map { it.id })
    }
}
