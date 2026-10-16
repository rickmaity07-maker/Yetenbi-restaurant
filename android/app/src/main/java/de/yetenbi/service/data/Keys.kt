package de.yetenbi.service.data

import android.util.Base64
import java.security.SecureRandom

/* Random keys for rounds and payments: the server books a request with the same key only once. */
object Keys {
    private val random = SecureRandom()

    fun new(): String =
        Base64.encodeToString(ByteArray(18).also { random.nextBytes(it) }, Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP)
}
