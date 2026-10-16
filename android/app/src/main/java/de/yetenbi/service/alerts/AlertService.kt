package de.yetenbi.service.alerts

import android.annotation.SuppressLint
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.provider.Settings
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import androidx.core.net.toUri
import de.yetenbi.service.MainActivity
import de.yetenbi.service.R
import de.yetenbi.service.ServiceApp
import de.yetenbi.service.data.ApiException
import de.yetenbi.service.i18n.stringsFor
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

/*
  "Food ready" also with the app closed or the phone in a pocket: while signed in, a small permanent notification
  ("Service aktiv") keeps this service running, and it asks the website every 5 seconds whether the kitchen has
  marked anything ready. While the app itself is open it stays quiet (the app polls then).
  Android may still pause it in deep sleep; for that, the app asks once to be left out of battery optimisation.
*/
class AlertService : Service() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val container = (application as ServiceApp).container
        val strings = stringsFor(container.session.languageNow)
        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(
            NotificationChannel(CHANNEL, strings.alerts.serviceChannel, NotificationManager.IMPORTANCE_MIN).apply { setShowBadge(false) },
        )
        val open = PendingIntent.getActivity(
            this, 0, Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val notification = NotificationCompat.Builder(this, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_bell)
            .setContentTitle(strings.alerts.serviceTitle)
            .setContentText(strings.alerts.serviceText)
            .setOngoing(true)
            .setSilent(true)
            .setContentIntent(open)
            .build()
        val type = if (Build.VERSION.SDK_INT >= 34) ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE else 0
        runCatching { ServiceCompat.startForeground(this, ID, notification, type) }.onFailure { stopSelf(); return START_NOT_STICKY }

        if (!running) {
            running = true
            scope.launch {
                while (isActive) {
                    delay(5_000)
                    if (container.session.token == null) break
                    if (AppVisibility.foreground || !container.session.bellNow) continue
                    try {
                        val checks = container.api.openChecks().checks
                        val language = container.session.languageNow
                        container.readyWatch.fresh(checks).forEach { (check, items) ->
                            KitchenAlerts.ring(this@AlertService, check, items.joinToString(", ") { "${it.qty}× ${it.name.of(language)}" }, stringsFor(language))
                        }
                    } catch (e: ApiException) {
                        if (e.code == "unauthorized") break
                    }
                }
                stopSelf()
            }
        }
        return START_STICKY
    }

    override fun onDestroy() {
        running = false
        scope.cancel()
        super.onDestroy()
    }

    companion object {
        private const val CHANNEL = "service-active"
        private const val ID = 3001
        @Volatile private var running = false

        fun start(context: Context) {
            runCatching { ContextCompat.startForegroundService(context, Intent(context, AlertService::class.java)) }
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, AlertService::class.java))
        }

        fun ignoresBatteryOptimisation(context: Context) =
            context.getSystemService(PowerManager::class.java).isIgnoringBatteryOptimizations(context.packageName)

        /* The system dialog "Let app always run in background?". */
        @SuppressLint("BatteryLife")
        fun batteryIntent(context: Context) =
            Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, "package:${context.packageName}".toUri())
    }
}
