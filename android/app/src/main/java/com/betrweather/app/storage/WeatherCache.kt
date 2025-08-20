package com.betrweather.app.storage

import android.content.Context
import android.content.SharedPreferences
import android.content.Intent
import android.util.Log

class WeatherCache(private val context: Context) {
    
    companion object {
        private const val PREFS_NAME = "WeatherPrefs"
        private const val KEY_TEMPERATURE = "temp"
        private const val KEY_CONDITION = "condition"
        private const val KEY_ICON = "icon"
        private const val KEY_LAST_LAT = "last_lat"
        private const val KEY_LAST_LON = "last_lon"
        private const val KEY_TIMESTAMP = "timestamp"
        private const val KEY_LAST_UPDATE = "last_update"
        private const val KEY_UPDATE_COUNTER = "update_counter"
    }
    
    private val sharedPreferences: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    
    fun saveWeather(temp: String, condition: String, icon: String, timestamp: Long) {
        try {
            // Get current counter and increment it
            val currentCounter = getUpdateCounter()
            val newCounter = currentCounter + 1
            
            sharedPreferences.edit()
                .putString(KEY_TEMPERATURE, temp)
                .putString(KEY_CONDITION, condition)
                .putString(KEY_ICON, icon)
                .putLong(KEY_TIMESTAMP, timestamp)
                .putLong(KEY_LAST_UPDATE, System.currentTimeMillis())
                .putInt(KEY_UPDATE_COUNTER, newCounter)
                .apply()
            
            Log.d("WeatherCache", "Weather data saved: $temp, $condition, Update #$newCounter")
            
            // Force a manual refresh of the widget
            forceWidgetRefresh()
            
        } catch (e: Exception) {
            Log.e("WeatherCache", "Error saving weather data", e)
        }
    }
    
    fun getWeather(): WeatherData? {
        return try {
            val temp = sharedPreferences.getString(KEY_TEMPERATURE, null)
            val condition = sharedPreferences.getString(KEY_CONDITION, null)
            val icon = sharedPreferences.getString(KEY_ICON, null)
            val timestamp = sharedPreferences.getLong(KEY_TIMESTAMP, 0)
            
            if (temp != null && condition != null && icon != null && timestamp > 0) {
                WeatherData(temp, condition, icon, timestamp)
            } else {
                null
            }
        } catch (e: Exception) {
            Log.e("WeatherCache", "Error getting weather data", e)
            null
        }
    }
    
    // NEW: Get update counter
    fun getUpdateCounter(): Int {
        return sharedPreferences.getInt(KEY_UPDATE_COUNTER, 0)
    }
    
    // NEW: Reset update counter (useful for debugging)
    fun resetUpdateCounter() {
        try {
            sharedPreferences.edit()
                .putInt(KEY_UPDATE_COUNTER, 0)
                .apply()
            Log.d("WeatherCache", "Update counter reset to 0")
        } catch (e: Exception) {
            Log.e("WeatherCache", "Error resetting update counter", e)
        }
    }
    
    fun saveLastLocation(latitude: Double, longitude: Double) {
        try {
            sharedPreferences.edit()
                .putFloat(KEY_LAST_LAT, latitude.toFloat())
                .putFloat(KEY_LAST_LON, longitude.toFloat())
                .apply()
            
            Log.d("WeatherCache", "Location saved: $latitude, $longitude")
        } catch (e: Exception) {
            Log.e("WeatherCache", "Error saving location", e)
        }
    }
    
    fun getLastLocation(): Pair<Double, Double>? {
        return try {
            val lat = sharedPreferences.getFloat(KEY_LAST_LAT, 0f)
            val lon = sharedPreferences.getFloat(KEY_LAST_LON, 0f)
            
            if (lat != 0f && lon != 0f) {
                Pair(lat.toDouble(), lon.toDouble())
            } else {
                null
            }
        } catch (e: Exception) {
            Log.e("WeatherCache", "Error getting location", e)
            null
        }
    }
    
    fun getLastUpdateTime(): Long {
        return sharedPreferences.getLong(KEY_LAST_UPDATE, 0)
    }
    
    fun clearCache() {
        try {
            sharedPreferences.edit().clear().apply()
            Log.d("WeatherCache", "Cache cleared")
        } catch (e: Exception) {
            Log.e("WeatherCache", "Error clearing cache", e)
        }
    }

    fun setUnit(unit: String) {
        try {
            sharedPreferences.edit()
                .putString("unit", unit)
                .apply()
            Log.d("WeatherCache", "Unit set to: $unit")
        } catch (e: Exception) {
            Log.e("WeatherCache", "Error setting unit", e)
        }
    }

    fun setHexCell(hexCell: String) {
        try {
            sharedPreferences.edit()
                .putString("hex_cell", hexCell)
                .apply()
            Log.d("WeatherCache", "Hex cell set to: $hexCell")
        } catch (e: Exception) {
            Log.e("WeatherCache", "Error setting hex cell", e)
        }
    }

    fun getUnit(): String {
        return sharedPreferences.getString("unit", "CELSIUS") ?: "CELSIUS"
    }

    fun getHexCell(): String? {
        return sharedPreferences.getString("hex_cell", null)
    }

    fun isDataFresh(maxAgeMinutes: Int): Boolean {
        val lastUpdate = getLastUpdateTime()
        if (lastUpdate == 0L) return false
        val ageMinutes = (System.currentTimeMillis() - lastUpdate) / (1000 * 60)
        return ageMinutes <= maxAgeMinutes
    }

    // NEW: Add this method
    private fun forceWidgetRefresh() {
        try {
            // Send a direct broadcast to refresh the widget
            val intent = Intent("com.betrweather.app.ACTION_REFRESH_WIDGET")
            context.sendBroadcast(intent)
            Log.d("WeatherCache", "Widget refresh broadcast sent")
        } catch (e: Exception) {
            Log.e("WeatherCache", "Error sending widget refresh broadcast", e)
        }
    }
}

data class WeatherData(
    val temperature: String,
    val condition: String,
    val icon: String,
    val timestamp: Long
)