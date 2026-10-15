package de.yetenbi.service.i18n

import androidx.compose.runtime.staticCompositionLocalOf

/* Everything the app says, in German (default, like the website) and English. Dish names come from the menu. */
data class Strings(
    val code: String,
    val common: Common,
    val nav: Nav,
    val login: Login,
    val tables: Tables,
    val check: CheckCopy,
    val pay: Pay,
    val today: Today,
    val settings: Settings,
    val alerts: Alerts,
    val update: Update,
    val errors: Map<String, String>,
) {
    fun error(code: String) = errors[code] ?: errors["generic"]!!

    data class Common(
        val cancel: String, val save: String, val back: String, val retry: String, val undo: String, val offline: String,
        val guests: (Int) -> String, val minutes: (Long) -> String, val since: (String) -> String, val total: String,
    )
    data class Nav(val tables: String, val today: String, val settings: String)
    data class Login(
        val title: String, val lead: String, val email: String, val password: String, val submit: String, val busy: String,
        val version: (String) -> String,
    )
    data class Tables(
        val title: String, val occupied: (Int, Int) -> String, val free: String, val cooking: (Int) -> String, val ready: (Int) -> String,
        val openTitle: (String) -> String, val openHint: String, val open: String, val legendFree: String, val legendBusy: String,
        val legendReady: String, val seats: (Int) -> String,
    )
    data class CheckCopy(
        val table: (String) -> String, val bill: String, val menu: String, val newRound: String, val sendKitchen: (Int) -> String,
        val book: (Int) -> String, val emptyBill: String, val emptyBillHint: String, val emptyRound: String, val round: (Int, String) -> String,
        val statusSent: String, val statusReady: String, val statusServed: String, val statusVoid: String, val atPass: String,
        val allServed: String, val served: String, val voidItem: String, val voidReason: String, val voidReasons: List<String>,
        val noteTitle: String, val notePlaceholder: String, val noteSuggestions: List<String>, val addNote: String,
        val moveTable: String, val moveHint: String, val changeGuests: String, val voidCheck: String, val voidCheckHint: String,
        val payButton: (String) -> String, val perPerson: (String) -> String, val soldOut: String, val all: String,
        val sentToKitchen: (String) -> String, val booked: String, val by: (String) -> String, val vegan: String, val spicy: String,
    )
    data class Pay(
        val title: (String) -> String, val method: String, val cash: String, val card: String, val tip: String, val noTip: String,
        val roundUp: String, val custom: String, val given: String, val exact: String, val change: (String) -> String,
        val toPay: String, val confirm: (String) -> String, val tooLittle: String, val paid: (String, String) -> String,
    )
    data class Today(
        val title: String, val revenue: String, val cash: String, val card: String, val tips: String, val checks: (Int) -> String,
        val empty: String, val emptyHint: String, val paidCash: String, val paidCard: String, val voided: String, val reopen: String,
        val previous: String, val next: String,
    )
    data class Settings(
        val title: String, val signedInAs: String, val language: String, val bell: String, val bellHint: String,
        val version: (String) -> String, val checkUpdates: String, val signOut: String, val server: String,
    )
    data class Alerts(val channel: String, val ready: (String) -> String)
    data class Update(
        val channel: String, val available: (String) -> String, val current: (String) -> String, val whatsNew: String,
        val install: String, val later: String, val tapToInstall: String, val mandatoryTitle: String, val mandatoryBody: String,
        val downloading: (Int) -> String, val installing: String, val permissionTitle: String, val permissionBody: String,
        val openSettings: String, val failed: String, val reasons: Map<String, String>, val upToDate: String,
    )
}

private val de = Strings(
    code = "de",
    common = Strings.Common(
        cancel = "Abbrechen", save = "Speichern", back = "Zurück", retry = "Nochmal", undo = "Rückgängig",
        offline = "Keine Verbindung – Änderungen werden nicht gespeichert",
        guests = { if (it == 1) "1 Gast" else "$it Gäste" }, minutes = { "$it Min." }, since = { "seit $it" }, total = "Summe",
    ),
    nav = Strings.Nav(tables = "Tische", today = "Heute", settings = "Einstellungen"),
    login = Strings.Login(
        title = "Service", lead = "Mit deinem Yetenbi-Konto anmelden – derselbe Login wie auf der Website.",
        email = "E-Mail", password = "Passwort", submit = "Anmelden", busy = "Melde an …", version = { "Version $it" },
    ),
    tables = Strings.Tables(
        title = "Tische", occupied = { busy, all -> "$busy von $all besetzt" }, free = "frei",
        cooking = { "$it in der Küche" }, ready = { "$it fertig!" },
        openTitle = { "Tisch $it öffnen" }, openHint = "Wie viele Gäste?", open = "Tisch öffnen",
        legendFree = "Frei", legendBusy = "Besetzt", legendReady = "Essen fertig", seats = { "$it Plätze" },
    ),
    check = Strings.CheckCopy(
        table = { "Tisch $it" }, bill = "Rechnung", menu = "Speisekarte", newRound = "Neue Bestellung",
        sendKitchen = { "An die Küche · $it" }, book = { "Buchen · $it" },
        emptyBill = "Noch nichts bestellt", emptyBillHint = "Gerichte aus der Speisekarte antippen, dann an die Küche schicken.",
        emptyRound = "Gerichte antippen, um sie hinzuzufügen.", round = { n, time -> "Gang $n · $time" },
        statusSent = "In der Küche", statusReady = "Fertig – abholen", statusServed = "Serviert", statusVoid = "Storniert",
        atPass = "Am Pass – bitte abholen", allServed = "Alles serviert", served = "Serviert", voidItem = "Stornieren",
        voidReason = "Grund", voidReasons = listOf("Falsch eingegeben", "Gast hat abbestellt", "Reklamation", "Aufs Haus"),
        noteTitle = "Wunsch für die Küche", notePlaceholder = "z. B. ohne Zwiebeln",
        noteSuggestions = listOf("extra scharf", "mild", "ohne Zwiebeln", "ohne Fleisch", "Injera extra", "glutenfrei"),
        addNote = "Wunsch", moveTable = "Tisch wechseln", moveHint = "Auf welchen freien Tisch?", changeGuests = "Gäste ändern",
        voidCheck = "Tisch stornieren", voidCheckHint = "Der Tisch wird ohne Zahlung frei. Offene Beträge darf nur die Verwaltung stornieren.",
        payButton = { "Kassieren · $it" }, perPerson = { "$it pro Person" }, soldOut = "Aus", all = "Alle",
        sentToKitchen = { "An die Küche: $it" }, booked = "Gebucht", by = { "von $it" }, vegan = "vegan", spicy = "scharf",
    ),
    pay = Strings.Pay(
        title = { "Tisch $it kassieren" }, method = "Zahlart", cash = "Bar", card = "Karte", tip = "Trinkgeld", noTip = "Kein",
        roundUp = "Aufrunden", custom = "Betrag", given = "Gegeben", exact = "Passend", change = { "Rückgeld $it" },
        toPay = "Zu zahlen", confirm = { "$it kassiert" }, tooLittle = "Zu wenig gegeben",
        paid = { table, amount -> "Tisch $table bezahlt · $amount" },
    ),
    today = Strings.Today(
        title = "Heute", revenue = "Umsatz", cash = "Bar", card = "Karte", tips = "Trinkgeld", checks = { "$it Rechnungen" },
        empty = "Noch keine Rechnung", emptyHint = "Bezahlte Tische erscheinen hier.", paidCash = "bar", paidCard = "Karte",
        voided = "storniert", reopen = "Wieder öffnen", previous = "Vortag", next = "Nächster Tag",
    ),
    settings = Strings.Settings(
        title = "Einstellungen", signedInAs = "Angemeldet als", language = "Sprache", bell = "Klingel bei „Essen fertig“",
        bellHint = "Ton und Benachrichtigung, sobald die Küche ein Gericht fertig meldet.",
        version = { "Version $it" }, checkUpdates = "Nach Updates suchen", signOut = "Abmelden", server = "Server",
    ),
    alerts = Strings.Alerts(channel = "Essen fertig", ready = { "Tisch $it: Essen fertig" }),
    update = Strings.Update(
        channel = "App-Updates", available = { "Update $it verfügbar" }, current = { "Installiert: $it" }, whatsNew = "Neu",
        install = "Installieren", later = "Später", tapToInstall = "Tippen, um zu installieren.",
        mandatoryTitle = "Update erforderlich", mandatoryBody = "Diese Version wird nicht mehr unterstützt. Bitte jetzt aktualisieren.",
        downloading = { "Lade herunter … $it %" }, installing = "Installiere …",
        permissionTitle = "Einmalige Erlaubnis nötig", permissionBody = "Android muss der App einmal erlauben, Updates zu installieren.",
        openSettings = "Erlauben", failed = "Update fehlgeschlagen",
        reasons = mapOf("offline" to "Keine Verbindung.", "checksum" to "Datei beschädigt – bitte nochmal.", "aborted" to "Abgebrochen."),
        upToDate = "Die App ist aktuell.",
    ),
    errors = mapOf(
        "generic" to "Das hat nicht geklappt. Bitte nochmal.",
        "offline" to "Keine Verbindung zum Server.",
        "unauthorized" to "Bitte neu anmelden.",
        "credentials" to "E-Mail oder Passwort stimmt nicht.",
        "too_many" to "Zu viele Versuche. Bitte 15 Minuten warten.",
        "no_app_access" to "Dieses Konto hat keinen Zugang zur Service-App. Die Verwaltung kann ihn unter Team freischalten.",
        "unavailable" to "Der Server ist gerade nicht erreichbar.",
        "table_busy" to "Dieser Tisch ist schon besetzt.",
        "table_not_found" to "Diesen Tisch gibt es nicht mehr.",
        "check_closed" to "Dieser Tisch ist schon abgerechnet.",
        "check_not_found" to "Rechnung nicht gefunden.",
        "dish_not_found" to "Ein Gericht ist nicht mehr auf der Karte.",
        "dish_sold_out" to "Ein Gericht ist gerade ausverkauft.",
        "items_invalid" to "Die Bestellung ist unvollständig.",
        "reason_required" to "Bitte einen Grund angeben.",
        "nothing_to_pay" to "Auf der Rechnung steht nichts.",
        "given_too_low" to "Gegebener Betrag reicht nicht.",
        "void_owner_only" to "Offene Beträge darf nur die Verwaltung stornieren.",
        "owner_only" to "Nur für die Verwaltung.",
        "guests_invalid" to "Bitte 1 bis 40 Gäste.",
        "total_changed" to "Die Rechnung wurde gerade geändert. Bitte Summe prüfen und nochmal kassieren.",
    ),
)

private val en = Strings(
    code = "en",
    common = Strings.Common(
        cancel = "Cancel", save = "Save", back = "Back", retry = "Try again", undo = "Undo",
        offline = "No connection – changes are not saved",
        guests = { if (it == 1) "1 guest" else "$it guests" }, minutes = { "$it min" }, since = { "since $it" }, total = "Total",
    ),
    nav = Strings.Nav(tables = "Tables", today = "Today", settings = "Settings"),
    login = Strings.Login(
        title = "Service", lead = "Sign in with your Yetenbi account – the same login as on the website.",
        email = "Email", password = "Password", submit = "Sign in", busy = "Signing in …", version = { "Version $it" },
    ),
    tables = Strings.Tables(
        title = "Tables", occupied = { busy, all -> "$busy of $all taken" }, free = "free",
        cooking = { "$it cooking" }, ready = { "$it ready!" },
        openTitle = { "Open table $it" }, openHint = "How many guests?", open = "Open table",
        legendFree = "Free", legendBusy = "Taken", legendReady = "Food ready", seats = { "$it seats" },
    ),
    check = Strings.CheckCopy(
        table = { "Table $it" }, bill = "Bill", menu = "Menu", newRound = "New order",
        sendKitchen = { "Send to kitchen · $it" }, book = { "Book · $it" },
        emptyBill = "Nothing ordered yet", emptyBillHint = "Tap dishes on the menu, then send them to the kitchen.",
        emptyRound = "Tap dishes to add them.", round = { n, time -> "Course $n · $time" },
        statusSent = "Cooking", statusReady = "Ready – pick up", statusServed = "Served", statusVoid = "Voided",
        atPass = "At the pass – please pick up", allServed = "All served", served = "Served", voidItem = "Void",
        voidReason = "Reason", voidReasons = listOf("Entered by mistake", "Guest cancelled", "Complaint", "On the house"),
        noteTitle = "Note for the kitchen", notePlaceholder = "e.g. no onions",
        noteSuggestions = listOf("extra spicy", "mild", "no onions", "no meat", "extra injera", "gluten-free"),
        addNote = "Note", moveTable = "Move table", moveHint = "To which free table?", changeGuests = "Change guests",
        voidCheck = "Void table", voidCheckHint = "Frees the table without payment. Only managers may void amounts still owed.",
        payButton = { "Take payment · $it" }, perPerson = { "$it per person" }, soldOut = "Out", all = "All",
        sentToKitchen = { "To the kitchen: $it" }, booked = "Booked", by = { "by $it" }, vegan = "vegan", spicy = "spicy",
    ),
    pay = Strings.Pay(
        title = { "Table $it – payment" }, method = "Method", cash = "Cash", card = "Card", tip = "Tip", noTip = "None",
        roundUp = "Round up", custom = "Amount", given = "Given", exact = "Exact", change = { "Change $it" },
        toPay = "To pay", confirm = { "$it received" }, tooLittle = "Not enough given",
        paid = { table, amount -> "Table $table paid · $amount" },
    ),
    today = Strings.Today(
        title = "Today", revenue = "Revenue", cash = "Cash", card = "Card", tips = "Tips", checks = { "$it bills" },
        empty = "No bills yet", emptyHint = "Paid tables appear here.", paidCash = "cash", paidCard = "card",
        voided = "voided", reopen = "Reopen", previous = "Previous day", next = "Next day",
    ),
    settings = Strings.Settings(
        title = "Settings", signedInAs = "Signed in as", language = "Language", bell = "Ring on “food ready”",
        bellHint = "Sound and notification as soon as the kitchen marks a dish ready.",
        version = { "Version $it" }, checkUpdates = "Check for updates", signOut = "Sign out", server = "Server",
    ),
    alerts = Strings.Alerts(channel = "Food ready", ready = { "Table $it: food ready" }),
    update = Strings.Update(
        channel = "App updates", available = { "Update $it available" }, current = { "Installed: $it" }, whatsNew = "New",
        install = "Install", later = "Later", tapToInstall = "Tap to install.",
        mandatoryTitle = "Update required", mandatoryBody = "This version is no longer supported. Please update now.",
        downloading = { "Downloading … $it %" }, installing = "Installing …",
        permissionTitle = "One-time permission needed", permissionBody = "Android must allow the app once to install updates.",
        openSettings = "Allow", failed = "Update failed",
        reasons = mapOf("offline" to "No connection.", "checksum" to "File damaged – please retry.", "aborted" to "Cancelled."),
        upToDate = "The app is up to date.",
    ),
    errors = mapOf(
        "generic" to "That didn't work. Please try again.",
        "offline" to "No connection to the server.",
        "unauthorized" to "Please sign in again.",
        "credentials" to "Email or password is wrong.",
        "too_many" to "Too many attempts. Please wait 15 minutes.",
        "no_app_access" to "This account has no access to the service app. A manager can grant it under Team.",
        "unavailable" to "The server is not reachable right now.",
        "table_busy" to "This table is already taken.",
        "table_not_found" to "This table no longer exists.",
        "check_closed" to "This table has already been paid.",
        "check_not_found" to "Bill not found.",
        "dish_not_found" to "A dish is no longer on the menu.",
        "dish_sold_out" to "A dish is sold out right now.",
        "items_invalid" to "The order is incomplete.",
        "reason_required" to "Please give a reason.",
        "nothing_to_pay" to "There is nothing on the bill.",
        "given_too_low" to "The amount given is not enough.",
        "void_owner_only" to "Only managers may void amounts still owed.",
        "owner_only" to "Managers only.",
        "guests_invalid" to "Please 1 to 40 guests.",
        "total_changed" to "The bill was just changed. Please check the total and take payment again.",
    ),
)

fun stringsFor(code: String) = if (code == "en") en else de

val LocalStrings = staticCompositionLocalOf { de }
