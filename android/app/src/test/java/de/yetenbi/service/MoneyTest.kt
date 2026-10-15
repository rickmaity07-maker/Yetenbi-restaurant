package de.yetenbi.service

import de.yetenbi.service.data.Money
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class MoneyTest {
    @Test fun parsesCommaAndDot() {
        assertEquals(450, Money.parse("4,5"))
        assertEquals(1490, Money.parse("14.90"))
        assertEquals(2000, Money.parse("20"))
        assertNull(Money.parse("abc"))
        assertNull(Money.parse("1.234"))
    }

    @Test fun roundsUpToTheNextEuro() {
        assertEquals(3800, Money.roundUp(3740))
        assertEquals(3800, Money.roundUp(3800))
    }

    @Test fun tipPercentRoundsToTenCents() {
        assertEquals(370, Money.percent(3740, 10))
        assertEquals(190, Money.percent(3740, 5))
    }

    @Test fun changeNeverNegative() {
        assertEquals(1260, Money.change(5000, 3740))
        assertEquals(0, Money.change(3000, 3740))
    }

    @Test fun likelyNotesAreAboveTheAmount() {
        assertEquals(listOf(4000, 5000, 10000), Money.likelyNotes(3740))
    }
}
