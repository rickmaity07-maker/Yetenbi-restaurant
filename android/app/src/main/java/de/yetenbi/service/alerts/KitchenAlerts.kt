package de.yetenbi.service.alerts

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.media.RingtoneManager
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import de.yetenbi.service.MainActivity
import de.yetenbi.service.R
import de.yetenbi.service.data.Check
import de.yetenbi.service.i18n.Strings

/*
  "Table 2: food ready" in the notification bar, with sound and vibration, as soon as the kitchen presses "Fertig".
  The app checks every 5 seconds while it runs (also in the background); one notification per table, replaced when
  more food for the same table becomes ready.
*/
object KitchenAlerts {
    private const val CHANNEL = "kitchen-ready"

    fun ring(context: Context, check: Check, dishes: String, strings: Strings) {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return
        val manager = context.getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(
            NotificationChannel(CHANNEL, strings.alerts.channel, NotificationManager.IMPORTANCE_HIGH).apply {
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 250, 120, 250)
                setSound(
                    RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION),
                    AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION).build(),
                )
            },
        )
        val open = PendingIntent.getActivity(
            context, check.id.toInt(),
            Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val notification = NotificationCompat.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_bell)
            .setColor(0xFF7FCF9C.toInt())
            .setContentTitle(strings.alerts.ready(check.tableLabel))
            .setContentText(dishes)
            .setStyle(NotificationCompat.BigTextStyle().bigText(dishes))
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(open)
            .setAutoCancel(true)
            .build()
        runCatching { NotificationManagerCompat.from(context).notify(2000 + check.id.toInt(), notification) }
    }
}
