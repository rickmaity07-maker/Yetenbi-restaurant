package de.yetenbi.service.ui

import android.app.Application
import android.net.Uri
import android.util.Base64
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import de.yetenbi.service.BuildConfig
import de.yetenbi.service.ServiceApp
import de.yetenbi.service.alerts.KitchenAlerts
import de.yetenbi.service.data.ApiException
import de.yetenbi.service.data.Bootstrap
import de.yetenbi.service.data.Check
import de.yetenbi.service.data.CheckList
import de.yetenbi.service.data.DiningTable
import de.yetenbi.service.data.Dish
import de.yetenbi.service.data.ItemStatus
import de.yetenbi.service.data.Money
import de.yetenbi.service.data.PayMethod
import de.yetenbi.service.data.RoundLine
import de.yetenbi.service.data.Times
import de.yetenbi.service.data.User
import de.yetenbi.service.i18n.Strings
import de.yetenbi.service.i18n.stringsFor
import de.yetenbi.service.updates.Release
import de.yetenbi.service.updates.UpdateNotifier
import de.yetenbi.service.updates.UpdateState
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.security.MessageDigest
import java.security.SecureRandom
import java.time.LocalDate

enum class Phase { Loading, SignedOut, SignedIn }
enum class Screen { Tables, Today, Settings }
enum class Pane { Bill, Menu }

data class UiState(
    val phase: Phase = Phase.Loading,
    val user: User? = null,
    val language: String = "de",
    val bell: Boolean = true,
    val boot: Bootstrap? = null,
    val offline: Boolean = false,
    val screen: Screen = Screen.Tables,
    val busy: Boolean = false,
    val loginBusy: Boolean = false,
    val loginError: String? = null,
    // Tables and the open check
    val checks: List<Check> = emptyList(),
    val checksLoaded: Boolean = false,
    val selectedId: Long? = null,
    val selected: Check? = null,
    val pane: Pane = Pane.Menu,
    val category: String? = null,
    val round: List<RoundLine> = emptyList(),
    val opening: DiningTable? = null,
    // Today
    val todayDate: LocalDate = Times.today(),
    val today: CheckList? = null,
    // Online updates
    val update: UpdateState = UpdateState.Idle,
    val updateDismissed: Boolean = false,
) {
    val strings: Strings get() = stringsFor(language)
    val tables get() = boot?.tables.orEmpty()
    val categories get() = boot?.categories.orEmpty()
    val roundCents get() = round.sumOf { it.dish.priceCents * it.qty }
    val roundCount get() = round.sumOf { it.qty }
    fun checkFor(tableId: String) = checks.firstOrNull { it.tableId == tableId }
    val freeTables get() = tables.filter { t -> checks.none { it.tableId == t.id } }
    /* Whether the round holds food (sent to the kitchen) or only drinks (booked straight away). */
    val roundHasFood get() = round.any { line -> categories.firstOrNull { c -> c.items.any { it.id == line.dish.id } }?.drinks != true }
}

data class Notice(val text: String, val error: Boolean = false)

/* base64url without padding, as PKCE wants it. */
private const val B64 = Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP

class AppViewModel(app: Application) : AndroidViewModel(app) {
    private val container = (app as ServiceApp).container
    private val api = container.api
    private val session = container.session
    private val updater = container.updater

    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state
    private val _notices = MutableSharedFlow<Notice>(extraBufferCapacity = 8)
    val notices: SharedFlow<Notice> = _notices

    private var poller: Job? = null
    /* Kitchen items already announced as ready, so each dish rings once. Empty until the first load. */
    private var announcedReady: Set<Long>? = null
    private val strings get() = _state.value.strings

    init {
        viewModelScope.launch {
            val saved = session.load()
            _state.update { it.copy(language = saved.language, bell = saved.bell) }
            if (saved.token != null && saved.user != null) startSession(saved.user) else signInDemoOrShowLogin()
        }
        viewModelScope.launch { updater.state.collect { s -> _state.update { it.copy(update = s) } } }
        // Look for a new version right away, then every half hour, signed in or not.
        viewModelScope.launch {
            while (isActive) {
                (updater.check() as? UpdateState.Available)?.let { UpdateNotifier.announce(getApplication(), it.release, _state.value.language) }
                delay(30 * 60_000L)
            }
        }
    }

    /* ---------- Plumbing ---------- */

    private fun notify(text: String, error: Boolean = false) {
        _notices.tryEmit(Notice(text, error))
    }

    /* Runs an API call with the busy line, offline detection and translated errors. */
    private fun act(showBusy: Boolean = true, block: suspend () -> Unit) {
        viewModelScope.launch {
            if (showBusy) _state.update { it.copy(busy = true) }
            try {
                block()
                _state.update { it.copy(offline = false) }
            } catch (e: ApiException) {
                handle(e)
            } finally {
                if (showBusy) _state.update { it.copy(busy = false) }
            }
        }
    }

    private suspend fun handle(e: ApiException) {
        when (e.code) {
            "offline" -> {
                _state.update { it.copy(offline = true) }
                notify(strings.error("offline"), error = true)
            }
            "unauthorized" -> {
                signOut(silent = true)
                notify(strings.error("unauthorized"), error = true)
            }
            "dish_not_found", "dish_sold_out", "table_not_found" -> {
                notify(strings.error(e.code), error = true)
                runCatching { api.bootstrap() }.getOrNull()?.let { boot -> _state.update { it.copy(boot = boot) } }
            }
            "total_changed" -> {
                notify(strings.error(e.code), error = true)
                _state.value.selectedId?.let { id -> runCatching { applyCheck(api.check(id)) } }
            }
            "check_closed", "table_busy" -> {
                notify(strings.error(e.code), error = true)
                refresh()
            }
            else -> notify(strings.error(e.code), error = true)
        }
    }

    private fun startSession(user: User) {
        _state.update { it.copy(phase = Phase.SignedIn, user = user, loginBusy = false, loginError = null) }
        announcedReady = null
        act(showBusy = false) {
            val boot = api.bootstrap()
            _state.update { it.copy(boot = boot, user = boot.user) }
        }
        refresh()
        poller?.cancel()
        poller = viewModelScope.launch {
            var tick = 0
            while (isActive) {
                delay(5_000)
                tick++
                if (_state.value.phase != Phase.SignedIn) break
                // Quietly keep every phone and tablet in step; failures only flip the offline banner.
                try {
                    if (!_state.value.busy) applyChecks(api.openChecks())
                    // Menu and table plan every 30 seconds, so sold-out dishes and new tables arrive quickly.
                    if (tick % 6 == 0) api.bootstrap().let { boot -> _state.update { it.copy(boot = boot) } }
                    _state.update { it.copy(offline = false) }
                } catch (e: ApiException) {
                    if (e.code == "offline") _state.update { it.copy(offline = true) } else if (e.code == "unauthorized") signOut(silent = true)
                }
            }
        }
    }

    /* New list of open checks: keep the selected one current and ring for food that just became ready. */
    private fun applyChecks(checks: List<Check>) {
        _state.update { s ->
            val selected = s.selectedId?.let { id -> checks.firstOrNull { it.id == id } }
            s.copy(checks = checks, checksLoaded = true, selected = selected ?: s.selected?.takeIf { it.id != s.selectedId })
        }
        val readyNow = checks.flatMap { c -> c.ready.map { it.id } }.toSet()
        val known = announcedReady
        announcedReady = readyNow
        if (known == null) return
        checks.forEach { check ->
            val fresh = check.ready.filter { it.id !in known }
            if (fresh.isEmpty()) return@forEach
            val dishes = fresh.joinToString(", ") { "${it.qty}× ${it.name.of(strings.code)}" }
            notify("${strings.alerts.ready(check.tableLabel)} – $dishes")
            if (_state.value.bell) KitchenAlerts.ring(getApplication(), check, dishes, strings)
        }
    }

    private fun refresh() = act(showBusy = false) { applyChecks(api.openChecks()) }

    /* Puts a changed check into the lists straight away (instead of waiting for the next poll). */
    private fun applyCheck(check: Check) {
        _state.update { s ->
            val list = if (check.isOpen) {
                if (s.checks.any { it.id == check.id }) s.checks.map { if (it.id == check.id) check else it } else s.checks + check
            } else s.checks.filterNot { it.id == check.id }
            s.copy(checks = list, selected = if (s.selectedId == check.id) check else s.selected)
        }
        // What the waiter just saw on screen needs no bell.
        announcedReady = (announcedReady ?: emptySet()) + check.ready.map { it.id }
    }

    /* ---------- Session ---------- */

    /* While the website has the app's sign-in switched off, everyone uses the shared demo account; else the login screen. */
    private suspend fun signInDemoOrShowLogin() {
        try {
            val result = api.loginDemo()
            session.signIn(result.token, result.user)
            startSession(result.user)
        } catch (e: ApiException) {
            _state.update { it.copy(phase = Phase.SignedOut) }
        }
    }

    fun login(email: String, password: String) {
        if (email.isBlank() || password.isBlank()) return
        _state.update { it.copy(loginBusy = true, loginError = null) }
        viewModelScope.launch {
            try {
                val result = api.login(email.trim(), password)
                session.signIn(result.token, result.user)
                startSession(result.user)
            } catch (e: ApiException) {
                _state.update { it.copy(loginBusy = false, loginError = strings.error(e.code)) }
            }
        }
    }

    /*
      "Sign in with Google": a fresh secret (PKCE verifier) is saved, the browser opens Google via the website, and the
      website sends the browser back with a one-time code (googleReturn), which only works together with the secret.
    */
    fun googleStart(open: (Uri) -> Unit) {
        val verifier = Base64.encodeToString(ByteArray(32).also { SecureRandom().nextBytes(it) }, B64)
        val challenge = Base64.encodeToString(MessageDigest.getInstance("SHA-256").digest(verifier.toByteArray()), B64)
        _state.update { it.copy(loginError = null) }
        viewModelScope.launch {
            session.setGoogleVerifier(verifier)
            open(Uri.parse(api.googleUrl(challenge)))
        }
    }

    fun googleReturn(uri: Uri) {
        if (uri.scheme != "de.yetenbi.service" || uri.host != "auth") return
        val code = uri.getQueryParameter("code")
        val error = uri.getQueryParameter("error")
        _state.update { it.copy(loginBusy = code != null, loginError = error?.let(strings::error)) }
        if (code == null) return
        viewModelScope.launch {
            val verifier = session.googleVerifier()
            session.setGoogleVerifier(null)
            try {
                if (verifier == null) throw ApiException("google", 0)
                val result = api.loginGoogle(code, verifier)
                session.signIn(result.token, result.user)
                startSession(result.user)
            } catch (e: ApiException) {
                _state.update { it.copy(loginBusy = false, loginError = strings.error(e.code)) }
            }
        }
    }

    fun signOut(silent: Boolean = false) {
        poller?.cancel()
        viewModelScope.launch {
            if (!silent) api.logout()
            session.signOut()
            _state.update { UiState(phase = Phase.Loading, language = it.language, bell = it.bell, update = it.update) }
            signInDemoOrShowLogin()
        }
    }

    fun setLanguage(code: String) {
        _state.update { it.copy(language = code) }
        viewModelScope.launch { session.setLanguage(code) }
    }

    fun setBell(on: Boolean) {
        _state.update { it.copy(bell = on) }
        viewModelScope.launch { session.setBell(on) }
    }

    fun go(screen: Screen) {
        _state.update { it.copy(screen = screen, selectedId = if (screen == Screen.Tables) it.selectedId else null) }
        when (screen) {
            Screen.Tables -> refresh()
            Screen.Today -> loadToday(_state.value.todayDate)
            Screen.Settings -> Unit
        }
    }

    /* ---------- Tables ---------- */

    /* Tapping a table: a free one asks how many guests, a taken one opens its check. */
    fun tapTable(table: DiningTable) {
        val check = _state.value.checkFor(table.id)
        if (check == null) _state.update { it.copy(opening = table) } else selectCheck(check.id)
    }

    fun cancelOpening() = _state.update { it.copy(opening = null) }

    fun openTable(table: DiningTable, guests: Int) = act {
        val check = api.openCheck(table.id, guests)
        applyCheck(check)
        _state.update { it.copy(opening = null, selectedId = check.id, selected = check, round = emptyList(), pane = Pane.Menu) }
    }

    fun selectCheck(id: Long?) {
        _state.update { s ->
            val check = id?.let { i -> s.checks.firstOrNull { it.id == i } }
            s.copy(
                selectedId = id,
                selected = check,
                round = if (s.selectedId == id) s.round else emptyList(),
                // Something already ordered: show the bill first; a fresh table goes straight to the menu.
                pane = if (check != null && check.items.isNotEmpty()) Pane.Bill else Pane.Menu,
            )
        }
        if (id != null) act(showBusy = false) { applyCheck(api.check(id)) }
    }

    fun setPane(pane: Pane) = _state.update { it.copy(pane = pane) }
    fun setCategory(id: String?) = _state.update { it.copy(category = id) }

    /* ---------- The round being put together ---------- */

    fun addToRound(dish: Dish, note: String = "") {
        if (!dish.available) return notify(strings.error("dish_sold_out"), error = true)
        _state.update { s ->
            val key = "${dish.id}|$note"
            val existing = s.round.firstOrNull { it.key == key }
            s.copy(round = if (existing != null) s.round.map { if (it.key == key) it.copy(qty = (it.qty + 1).coerceAtMost(99)) else it } else s.round + RoundLine(dish, 1, note))
        }
    }

    fun changeRound(key: String, delta: Int) = _state.update { s ->
        s.copy(round = s.round.mapNotNull { if (it.key == key) it.copy(qty = it.qty + delta).takeIf { l -> l.qty > 0 } else it })
    }

    /* A wish for the kitchen on one line; lines with the same dish and wish merge. */
    fun setRoundNote(key: String, note: String) = _state.update { s ->
        val line = s.round.firstOrNull { it.key == key } ?: return@update s
        val changed = line.copy(note = note.trim().take(140))
        val others = s.round.filterNot { it.key == key }
        val twin = others.firstOrNull { it.key == changed.key }
        s.copy(round = if (twin != null) others.map { if (it.key == twin.key) it.copy(qty = (it.qty + changed.qty).coerceAtMost(99)) else it } else s.round.map { if (it.key == key) changed else it })
    }

    fun clearRound() = _state.update { it.copy(round = emptyList()) }

    fun sendRound() {
        val s = _state.value
        val id = s.selectedId ?: return
        if (s.round.isEmpty()) return
        val lines = s.round
        act {
            val check = api.sendRound(id, lines)
            applyCheck(check)
            _state.update { it.copy(round = emptyList(), pane = Pane.Bill) }
            notify(strings.check.sentToKitchen(lines.joinToString(", ") { "${it.qty}× ${it.dish.name.of(strings.code)}" }))
        }
    }

    /* ---------- The check ---------- */

    fun serveItem(itemId: Long) {
        val id = _state.value.selectedId ?: return
        act { applyCheck(api.serveItem(id, itemId)) }
    }

    fun voidItem(itemId: Long, reason: String) {
        val id = _state.value.selectedId ?: return
        act { applyCheck(api.voidItem(id, itemId, reason)) }
    }

    fun serveReady(checkId: Long? = null) {
        val id = checkId ?: _state.value.selectedId ?: return
        act { applyCheck(api.serveReady(id)) }
    }

    fun setGuests(guests: Int) {
        val id = _state.value.selectedId ?: return
        act { applyCheck(api.updateCheck(id, guests = guests)) }
    }

    fun moveTo(table: DiningTable) {
        val id = _state.value.selectedId ?: return
        act { applyCheck(api.updateCheck(id, tableId = table.id)) }
    }

    fun voidCheck(reason: String) {
        val id = _state.value.selectedId ?: return
        act {
            val check = api.voidCheck(id, reason)
            applyCheck(check)
            _state.update { it.copy(selectedId = null, selected = null, round = emptyList()) }
            notify("${strings.check.table(check.tableLabel)}: ${strings.today.voided}")
        }
    }

    fun pay(method: PayMethod, tipCents: Int, givenCents: Int?, done: () -> Unit) {
        val id = _state.value.selectedId ?: return
        val expected = _state.value.selected?.totalCents ?: return
        act {
            val check = api.pay(id, method, expected, tipCents, givenCents)
            applyCheck(check)
            _state.update { it.copy(selectedId = null, selected = null, round = emptyList()) }
            notify(strings.pay.paid(check.tableLabel, Money.format(check.totalCents + check.tipCents, strings.code)))
            done()
        }
    }

    /* ---------- Today ---------- */

    fun loadToday(date: LocalDate) {
        _state.update { it.copy(todayDate = date) }
        act(showBusy = false) {
            val list = api.closedChecks(date.toString())
            if (_state.value.todayDate == date) _state.update { it.copy(today = list) }
        }
    }

    fun reopen(check: Check) = act {
        val reopened = api.reopen(check.id)
        applyCheck(reopened)
        _state.update { it.copy(screen = Screen.Tables, selectedId = reopened.id, selected = reopened, pane = Pane.Bill) }
    }

    /* ---------- Online updates ---------- */

    fun checkForUpdates() = viewModelScope.launch {
        _state.update { it.copy(updateDismissed = false) }
        if (updater.check() is UpdateState.Idle) notify(strings.update.upToDate)
    }

    fun installUpdate(release: Release) {
        _state.update { it.copy(updateDismissed = false) }
        viewModelScope.launch { updater.downloadAndInstall(release) }
    }

    fun dismissUpdate() = _state.update { it.copy(updateDismissed = true) }
    fun updatePermissionIntent() = updater.permissionIntent()
    val currentVersionName: String get() = BuildConfig.VERSION_NAME

    companion object {
        /* Items on a check that still count (for the bill list). */
        fun visibleItems(check: Check) = check.items.filter { it.status != ItemStatus.VOID || it.voidReason.isNotBlank() }
    }
}
