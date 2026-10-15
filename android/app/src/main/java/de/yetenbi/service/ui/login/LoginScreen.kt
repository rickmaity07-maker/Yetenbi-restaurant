package de.yetenbi.service.ui.login

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import de.yetenbi.service.BuildConfig
import de.yetenbi.service.i18n.LocalStrings
import de.yetenbi.service.ui.UiState
import de.yetenbi.service.ui.components.Cross
import de.yetenbi.service.ui.components.Eyebrow
import de.yetenbi.service.ui.components.FlagStripe
import de.yetenbi.service.ui.components.PillButton
import de.yetenbi.service.ui.components.Segmented
import de.yetenbi.service.ui.components.Tilet
import de.yetenbi.service.ui.theme.Yt

@Composable
fun fieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = Yt.Gold,
    unfocusedBorderColor = Yt.Gold.copy(alpha = 0.3f),
    focusedLabelColor = Yt.GoldSoft,
    unfocusedLabelColor = Yt.Sand,
    cursorColor = Yt.Gold,
    focusedTextColor = Yt.Cream,
    unfocusedTextColor = Yt.Cream,
)

@Composable
fun LoginScreen(state: UiState, onLogin: (String, String) -> Unit, onLanguage: (String) -> Unit) {
    val strings = LocalStrings.current
    var email by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }
    Box(Modifier.fillMaxSize().background(Yt.Night)) {
        FlagStripe(Modifier.align(Alignment.TopCenter), height = 3.dp)
        Column(
            Modifier.fillMaxSize().safeDrawingPadding().imePadding().verticalScroll(rememberScrollState()).padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Column(Modifier.widthIn(max = 420.dp).fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                Cross(size = 64.dp)
                Spacer(Modifier.height(16.dp))
                Text("Yetenbi", style = MaterialTheme.typography.displayMedium, color = Yt.Cream)
                Eyebrow(strings.login.title)
                Spacer(Modifier.height(14.dp))
                Tilet(Modifier.widthIn(max = 220.dp))
                Spacer(Modifier.height(18.dp))
                Text(strings.login.lead, style = MaterialTheme.typography.bodyMedium, color = Yt.Sand, textAlign = TextAlign.Center)
                Spacer(Modifier.height(28.dp))
                OutlinedTextField(
                    email, { email = it }, label = { Text(strings.login.email) }, singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
                    colors = fieldColors(), modifier = Modifier.fillMaxWidth().testTag("login-email"),
                )
                Spacer(Modifier.height(12.dp))
                OutlinedTextField(
                    password, { password = it }, label = { Text(strings.login.password) }, singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Go),
                    keyboardActions = KeyboardActions(onGo = { onLogin(email, password) }),
                    colors = fieldColors(), modifier = Modifier.fillMaxWidth().testTag("login-password"),
                )
                state.loginError?.let {
                    Spacer(Modifier.height(12.dp))
                    Text(it, color = Yt.Coral, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.testTag("login-error"))
                }
                Spacer(Modifier.height(20.dp))
                PillButton(
                    if (state.loginBusy) strings.login.busy else strings.login.submit,
                    { onLogin(email, password) },
                    enabled = !state.loginBusy && email.isNotBlank() && password.isNotBlank(),
                    big = true, modifier = Modifier.fillMaxWidth(), testTag = "login-submit",
                )
                Spacer(Modifier.height(28.dp))
                Segmented(listOf("de" to "Deutsch", "en" to "English"), state.language, onLanguage, Modifier.widthIn(max = 260.dp), testTagPrefix = "lang")
                Spacer(Modifier.height(16.dp))
                Text(strings.login.version(BuildConfig.VERSION_NAME), style = MaterialTheme.typography.bodySmall, color = Yt.Sand.copy(alpha = 0.6f))
            }
        }
    }
}
