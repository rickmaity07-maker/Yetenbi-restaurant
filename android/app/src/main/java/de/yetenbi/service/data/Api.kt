package de.yetenbi.service.data

import de.yetenbi.service.updates.UpdateInfo
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.util.concurrent.TimeUnit

/* A refusal from the server ("table_busy", "credentials", ...) or a dead connection (code "offline"). */
class ApiException(val code: String, val status: Int) : Exception(code)

/*
  The website's app API (the /api/app routes). Every call is a suspend function on the IO dispatcher; failures surface as
  ApiException with the server's machine-readable code, which Strings translates.
*/
class Api(baseUrl: String, private val tokenProvider: () -> String?, client: OkHttpClient? = null) {
    private val base = baseUrl.trimEnd('/')
    private val http = client ?: OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(20, TimeUnit.SECONDS)
        .callTimeout(30, TimeUnit.SECONDS)
        .build()

    val json = Json { ignoreUnknownKeys = true; explicitNulls = false; coerceInputValues = true }
    private val jsonType = "application/json; charset=utf-8".toMediaType()

    private suspend fun raw(method: String, path: String, body: JsonElement? = null, auth: Boolean = true): String =
        withContext(Dispatchers.IO) {
            val builder = Request.Builder().url(base + path).header("Accept", "application/json")
            if (auth) tokenProvider()?.let { builder.header("Authorization", "Bearer $it") }
            val requestBody = body?.toString()?.toRequestBody(jsonType)
            builder.method(method, requestBody ?: if (method == "GET") null else "{}".toRequestBody(jsonType))
            val response = try {
                http.newCall(builder.build()).execute()
            } catch (e: IOException) {
                throw ApiException("offline", 0)
            }
            response.use {
                val text = it.body?.string().orEmpty()
                if (!it.isSuccessful) {
                    val code = runCatching { json.parseToJsonElement(text).jsonObject["code"]?.jsonPrimitive?.contentOrNull }.getOrNull()
                    throw ApiException(code ?: "http_${it.code}", it.code)
                }
                text
            }
        }

    private suspend inline fun <reified T> get(path: String): T = json.decodeFromString(raw("GET", path))
    private suspend inline fun <reified T> send(method: String, path: String, body: JsonElement? = null): T =
        json.decodeFromString(raw(method, path, body))

    /* ---------- Session ---------- */

    suspend fun login(email: String, password: String): LoginResponse =
        json.decodeFromString(raw("POST", "/api/app/login", buildJsonObject { put("email", email); put("password", password) }, auth = false))

    /* Where "Sign in with Google" starts in the browser; challenge is the SHA-256 of the app's secret. */
    fun googleUrl(challenge: String) = "$base/api/auth/google?app=$challenge"

    suspend fun loginGoogle(code: String, verifier: String): LoginResponse =
        json.decodeFromString(raw("POST", "/api/app/login/google", buildJsonObject { put("code", code); put("verifier", verifier) }, auth = false))

    suspend fun logout() {
        runCatching { raw("POST", "/api/app/logout") }
    }

    suspend fun bootstrap(): Bootstrap = get("/api/app/bootstrap")

    /* ---------- Checks ---------- */

    suspend fun openChecks(): List<Check> = get<CheckList>("/api/app/checks").checks
    suspend fun closedChecks(date: String): CheckList = get("/api/app/checks?closed=$date")
    suspend fun check(id: Long): Check = get("/api/app/checks/$id")

    suspend fun openCheck(tableId: String, guests: Int): Check =
        send("POST", "/api/app/checks", buildJsonObject { put("tableId", tableId); put("guests", guests) })

    suspend fun updateCheck(id: Long, guests: Int? = null, note: String? = null, tableId: String? = null): Check =
        send("PATCH", "/api/app/checks/$id", buildJsonObject {
            guests?.let { put("guests", it) }
            note?.let { put("note", it) }
            tableId?.let { put("tableId", it) }
        })

    suspend fun sendRound(id: Long, lines: List<RoundLine>): Check =
        send("POST", "/api/app/checks/$id/round", buildJsonObject {
            put("items", buildJsonArray {
                lines.forEach { line -> add(buildJsonObject { put("itemId", line.dish.id); put("qty", line.qty); put("note", line.note) }) }
            })
        })

    suspend fun serveItem(id: Long, itemId: Long): Check =
        send("PATCH", "/api/app/checks/$id/items/$itemId", buildJsonObject { put("action", "serve") })

    suspend fun voidItem(id: Long, itemId: Long, reason: String): Check =
        send("PATCH", "/api/app/checks/$id/items/$itemId", buildJsonObject { put("action", "void"); put("reason", reason) })

    suspend fun serveReady(id: Long): Check = send("POST", "/api/app/checks/$id/serve")

    suspend fun pay(id: Long, method: PayMethod, expectedCents: Int, tipCents: Int, givenCents: Int?): Check =
        send("POST", "/api/app/checks/$id/pay", buildJsonObject {
            put("method", method.wire)
            put("expected", expectedCents / 100.0)
            put("tip", tipCents / 100.0)
            givenCents?.let { put("given", it / 100.0) }
        })

    suspend fun voidCheck(id: Long, reason: String): Check =
        send("POST", "/api/app/checks/$id/void", buildJsonObject { put("reason", reason) })

    suspend fun reopen(id: Long): Check = send("POST", "/api/app/checks/$id/reopen")

    /* ---------- Updates ---------- */

    suspend fun updateInfo(current: Int): UpdateInfo =
        json.decodeFromString(raw("GET", "/api/app/version?current=$current", auth = false))
}
