package de.yetenbi.service

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import de.yetenbi.service.alerts.AppVisibility
import de.yetenbi.service.ui.App
import de.yetenbi.service.ui.AppViewModel
import de.yetenbi.service.ui.Phase
import de.yetenbi.service.ui.theme.YetenbiTheme

class MainActivity : ComponentActivity() {
    private val viewModel: AppViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        // The cross stays on screen until the saved sign-in has been read.
        installSplashScreen().setKeepOnScreenCondition { viewModel.state.value.phase == Phase.Loading }
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        // Android 13+: ask once, so "food ready" and "update available" can appear in the notification bar.
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            registerForActivityResult(ActivityResultContracts.RequestPermission()) {}.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
        setContent { YetenbiTheme { App(viewModel) } }
        // Opened by the return link of "Sign in with Google" (also when the app was closed meanwhile).
        if (savedInstanceState == null) intent?.data?.let(viewModel::googleReturn)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        intent.data?.let(viewModel::googleReturn)
    }

    // While a screen is showing, the app polls itself and the background service keeps quiet.
    override fun onStart() {
        super.onStart()
        AppVisibility.foreground = true
    }

    override fun onStop() {
        AppVisibility.foreground = false
        super.onStop()
    }
}
