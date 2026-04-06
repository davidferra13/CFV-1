package com.cheflowhq.desktop.widgets

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import org.json.JSONObject
import org.json.JSONArray
import java.net.HttpURLConnection
import java.net.URL

object WidgetDataFetcher {
    private const val PREFS_NAME = "cf_widget_prefs"
    private const val KEY_API_KEY = "api_key"
    private const val KEY_BASE_URL = "base_url"
    private const val KEY_CACHE_PREFIX = "cache_"
    private const val DEFAULT_BASE_URL = "https://app.cheflowhq.com"

    private fun getPrefs(context: Context): SharedPreferences {
        return try {
            val masterKey = MasterKey.Builder(context)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build()
            EncryptedSharedPreferences.create(
                context, PREFS_NAME, masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            )
        } catch (e: Exception) {
            // Fallback to regular prefs if encryption unavailable
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        }
    }

    fun setApiKey(context: Context, apiKey: String) {
        getPrefs(context).edit().putString(KEY_API_KEY, apiKey).apply()
    }

    fun getApiKey(context: Context): String? {
        return getPrefs(context).getString(KEY_API_KEY, null)
    }

    fun setBaseUrl(context: Context, url: String) {
        getPrefs(context).edit().putString(KEY_BASE_URL, url).apply()
    }

    private fun getBaseUrl(context: Context): String {
        return getPrefs(context).getString(KEY_BASE_URL, DEFAULT_BASE_URL) ?: DEFAULT_BASE_URL
    }

    fun fetchJson(context: Context, path: String): JSONObject? {
        val apiKey = getApiKey(context) ?: return null
        val baseUrl = getBaseUrl(context)

        return try {
            val url = URL("$baseUrl$path")
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "GET"
            conn.setRequestProperty("Authorization", "Bearer $apiKey")
            conn.setRequestProperty("Accept", "application/json")
            conn.connectTimeout = 10000
            conn.readTimeout = 10000

            if (conn.responseCode == 200) {
                val body = conn.inputStream.bufferedReader().readText()
                val json = JSONObject(body)
                // Cache successful response
                cacheResponse(context, path, body)
                json
            } else {
                // Return cached data on failure
                getCachedResponse(context, path)
            }
        } catch (e: Exception) {
            getCachedResponse(context, path)
        }
    }

    fun postJson(context: Context, path: String, body: JSONObject): JSONObject? {
        val apiKey = getApiKey(context) ?: return null
        val baseUrl = getBaseUrl(context)

        return try {
            val url = URL("$baseUrl$path")
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Authorization", "Bearer $apiKey")
            conn.setRequestProperty("Content-Type", "application/json")
            conn.setRequestProperty("Accept", "application/json")
            conn.connectTimeout = 10000
            conn.readTimeout = 10000
            conn.doOutput = true

            conn.outputStream.bufferedWriter().use { it.write(body.toString()) }

            if (conn.responseCode in 200..201) {
                val respBody = conn.inputStream.bufferedReader().readText()
                JSONObject(respBody)
            } else null
        } catch (e: Exception) {
            null
        }
    }

    private fun cacheResponse(context: Context, path: String, body: String) {
        val prefs = context.getSharedPreferences("cf_widget_cache", Context.MODE_PRIVATE)
        prefs.edit()
            .putString(KEY_CACHE_PREFIX + path, body)
            .putLong(KEY_CACHE_PREFIX + path + "_ts", System.currentTimeMillis())
            .apply()
    }

    fun getCachedResponse(context: Context, path: String): JSONObject? {
        val prefs = context.getSharedPreferences("cf_widget_cache", Context.MODE_PRIVATE)
        val cached = prefs.getString(KEY_CACHE_PREFIX + path, null) ?: return null
        return try { JSONObject(cached) } catch (e: Exception) { null }
    }

    fun getCacheAge(context: Context, path: String): Long {
        val prefs = context.getSharedPreferences("cf_widget_cache", Context.MODE_PRIVATE)
        val ts = prefs.getLong(KEY_CACHE_PREFIX + path + "_ts", 0)
        return if (ts > 0) System.currentTimeMillis() - ts else Long.MAX_VALUE
    }

    fun isConfigured(context: Context): Boolean {
        return getApiKey(context) != null
    }
}
