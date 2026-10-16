package de.yetenbi.service.data

import android.content.Context
import android.os.Build
import de.yetenbi.service.BuildConfig
import java.io.File
import java.io.PrintWriter
import java.io.StringWriter

/*
  Crash reports: if the app crashes, the error is written to a file before Android closes it, and sent to the
  website on the next start (/api/app/crash). The owners see it in /admin/service and get an email.
  Nothing about guests or orders is in it: only the error, the app version and the device model.
*/
object CrashReporter {
    private const val FILE = "last-crash.txt"

    fun install(context: Context) {
        val file = File(context.filesDir, FILE)
        val previous = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, error ->
            runCatching {
                val trace = StringWriter().also { error.printStackTrace(PrintWriter(it)) }.toString()
                file.writeText("thread ${thread.name}\n$trace".take(12_000))
            }
            previous?.uncaughtException(thread, error)
        }
    }

    /* Sends a crash left over from last time, then forgets it. */
    suspend fun sendPending(context: Context, api: Api) {
        val file = File(context.filesDir, FILE)
        if (!file.exists()) return
        val trace = runCatching { file.readText() }.getOrNull()
        if (trace.isNullOrBlank()) { file.delete(); return }
        try {
            api.crash(trace, BuildConfig.VERSION_NAME, device, Build.VERSION.RELEASE)
            file.delete()
        } catch (e: ApiException) {
            // Offline: try again next start. Refused: drop it.
            if (e.code != "offline") file.delete()
        }
    }

    val device: String get() = "${Build.MANUFACTURER} ${Build.MODEL}".take(80)
}
