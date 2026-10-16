package de.yetenbi.service

import android.app.Application
import de.yetenbi.service.alerts.ReadyWatch
import de.yetenbi.service.data.Api
import de.yetenbi.service.data.CrashReporter
import de.yetenbi.service.data.SessionStore
import de.yetenbi.service.updates.UpdateNotifier
import de.yetenbi.service.updates.Updater

/* The few long-lived objects the app shares: the saved session, the website API, the updater and the "ready" bell. */
class Container(app: Application) {
    val session = SessionStore(app)
    val api = Api(BuildConfig.API_URL, tokenProvider = { session.token })
    val updater = Updater(app, api)
    val readyWatch = ReadyWatch()
}

class ServiceApp : Application() {
    lateinit var container: Container
        private set

    override fun onCreate() {
        super.onCreate()
        CrashReporter.install(this)
        container = Container(this)
        UpdateNotifier.schedule(this)
    }
}
