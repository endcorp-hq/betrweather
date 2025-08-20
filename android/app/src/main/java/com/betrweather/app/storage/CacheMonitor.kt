package com.betrweather.app.storage

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.util.Log
import com.betrweather.app.widget.WeatherWidgetProvider

class CacheMonitor(private val context: Context) : SharedPreferences.OnSharedPreferenceChangeListener {

    private val prefs: SharedPreferences = context.getSharedPreferences("WeatherPrefs", Context.MODE_PRIVATE)
    private var isRegistered = false

    fun start() {
        if (!isRegistered) {
            try {
                prefs.registerOnSharedPreferenceChangeListener(this)
                isRegistered = true
                Log.d("CacheMonitor", "Started monitoring cache changes")
                
                // Log all current preferences
                val allPrefs = prefs.all
                Log.d("CacheMonitor", "Current preferences: $allPrefs")
                Log.d("CacheMonitor", "Listener registration successful")
            } catch (e: Exception) {
                Log.e("CacheMonitor", "Error starting monitor", e)
                isRegistered = false
            }
        } else {
            Log.d("CacheMonitor", "Already monitoring cache changes")
        }
    }

    fun stop() {
        if (isRegistered) {
            try {
                prefs.unregisterOnSharedPreferenceChangeListener(this)
                isRegistered = false
                Log.d("CacheMonitor", "Stopped monitoring cache changes")
            } catch (e: Exception) {
                Log.e("CacheMonitor", "Error stopping monitor", e)
            }
        }
    }

    override fun onSharedPreferenceChanged(sharedPreferences: SharedPreferences?, key: String?) {
        try {
            // Safely get the value based on its type
            val value = when {
                key == "temp" || key == "condition" || key == "icon" -> 
                    sharedPreferences?.getString(key, "N/A")
                key == "timestamp" || key == "last_update" || key == "cache_refresh_trigger" -> 
                    sharedPreferences?.getLong(key, 0L).toString()
                key == "update_counter" -> 
                    sharedPreferences?.getInt(key, 0).toString()
                key == "last_lat" || key == "last_lon" -> 
                    sharedPreferences?.getFloat(key, 0f).toString()
                else -> "Unknown type"
            }
            
            Log.d("CacheMonitor", "Preference changed: key=$key, value=$value")
            
            if (key == "temp" || key == "condition" || key == "icon" || key == "timestamp" || 
                key == "update_counter" || key == "cache_refresh_trigger") {
                
                Log.d("CacheMonitor", "Weather cache updated ($key), refreshing widget")

                // Send broadcast to trigger widget update
                val intent = Intent(context, WeatherWidgetProvider::class.java)
                intent.action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                
                val appWidgetManager = AppWidgetManager.getInstance(context)
                val componentName = ComponentName(context, WeatherWidgetProvider::class.java)
                val ids = appWidgetManager.getAppWidgetIds(componentName)
                
                if (ids.isNotEmpty()) {
                    intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
                    context.sendBroadcast(intent)
                    Log.d("CacheMonitor", "Widget update broadcast sent for ${ids.size} widgets")
                } else {
                    Log.d("CacheMonitor", "No widgets to update")
                }
            }
        } catch (e: Exception) {
            Log.e("CacheMonitor", "Error in onSharedPreferenceChanged", e)
        }
    }
}
