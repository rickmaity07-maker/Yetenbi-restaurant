package de.yetenbi.service.alerts

import de.yetenbi.service.data.Check
import de.yetenbi.service.data.CheckItem

/*
  Which dishes have already been announced as "ready", shared by the open app and the background service, so each
  dish rings exactly once, whoever notices it first. The first look after a start only learns what is ready already.
*/
class ReadyWatch {
    private var known: Set<Long>? = null

    /* The dishes that became ready since the last look, per check. */
    @Synchronized
    fun fresh(checks: List<Check>): List<Pair<Check, List<CheckItem>>> {
        val readyNow = checks.flatMap { c -> c.ready.map { it.id } }.toSet()
        val before = known
        // Keep what was announced even if the dish is served meanwhile, until it leaves the open checks.
        known = readyNow + (before.orEmpty() intersect checks.flatMap { c -> c.items.map { it.id } }.toSet())
        if (before == null) return emptyList()
        return checks.mapNotNull { check -> check.ready.filter { it.id !in before }.takeIf { it.isNotEmpty() }?.let { check to it } }
    }

    /* What the waiter just saw on screen needs no bell. */
    @Synchronized
    fun seen(check: Check) {
        known = (known ?: emptySet()) + check.ready.map { it.id }
    }

    @Synchronized
    fun reset() {
        known = null
    }
}

/* Whether a screen of the app is showing; the background service stays quiet then and lets the app poll. */
object AppVisibility {
    @Volatile var foreground: Boolean = false
}
