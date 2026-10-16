package de.yetenbi.service.data

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first
import kotlinx.serialization.json.Json

private val Context.store by preferencesDataStore(name = "yetenbi")

/*
  What survives a restart: the sign-in token, who it belongs to, the language, whether "food ready" rings and
  whether it also rings with the app closed. Language and bell are also kept in memory for the background service.
*/
class SessionStore(private val context: Context) {
    private val tokenKey = stringPreferencesKey("token")
    private val userKey = stringPreferencesKey("user")
    private val languageKey = stringPreferencesKey("language")
    private val bellKey = booleanPreferencesKey("bell")
    private val backgroundKey = booleanPreferencesKey("background_alerts")
    private val json = Json { ignoreUnknownKeys = true }

    @Volatile var token: String? = null
        private set
    @Volatile var languageNow: String = "de"
        private set
    @Volatile var bellNow: Boolean = true
        private set

    suspend fun load(): Saved {
        val prefs = context.store.data.first()
        token = prefs[tokenKey]
        languageNow = prefs[languageKey] ?: "de"
        bellNow = prefs[bellKey] ?: true
        val user = prefs[userKey]?.let { runCatching { json.decodeFromString<User>(it) }.getOrNull() }
        return Saved(token, user, languageNow, bellNow, prefs[backgroundKey] ?: true)
    }

    suspend fun signIn(token: String, user: User) {
        this.token = token
        context.store.edit { it[tokenKey] = token; it[userKey] = json.encodeToString(User.serializer(), user) }
    }

    suspend fun signOut() {
        token = null
        context.store.edit { it.remove(tokenKey); it.remove(userKey) }
    }

    /* The PKCE secret of a Google sign-in under way: kept on disk, since Android may close the app while the browser is open. */
    private val googleKey = stringPreferencesKey("google_verifier")
    suspend fun setGoogleVerifier(value: String?) = context.store.edit { if (value == null) it.remove(googleKey) else it[googleKey] = value }
    suspend fun googleVerifier(): String? = context.store.data.first()[googleKey]

    suspend fun setLanguage(code: String) {
        languageNow = code
        context.store.edit { it[languageKey] = code }
    }

    suspend fun setBell(on: Boolean) {
        bellNow = on
        context.store.edit { it[bellKey] = on }
    }

    suspend fun setBackground(on: Boolean) = context.store.edit { it[backgroundKey] = on }

    data class Saved(val token: String?, val user: User?, val language: String, val bell: Boolean, val background: Boolean)
}
