const fs = require('fs');
const path = require('path');

const widgetConfig = require('../src/config/widgetConfig').widgetConfig;

// Generate weather_widget.xml
const generateWidgetLayout = () => {
  const layout = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_container"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:orientation="vertical"
    android:padding="16dp"
    android:background="@android:color/transparent"
    android:clickable="true"
    android:focusable="true">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:gravity="center_vertical">

        <TextView
            android:id="@+id/${widgetConfig.layout.temperature.id}"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="${widgetConfig.layout.temperature.defaultText}"
            android:textSize="${widgetConfig.layout.temperature.textSize}"
            android:textColor="${widgetConfig.layout.temperature.textColor}"
            android:textStyle="bold" />

        <TextView
            android:id="@+id/${widgetConfig.layout.condition.id}"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginStart="8dp"
            android:text="${widgetConfig.layout.condition.defaultText}"
            android:textSize="${widgetConfig.layout.condition.textSize}"
            android:textColor="${widgetConfig.layout.condition.textColor}" />

    </LinearLayout>

    <TextView
        android:id="@+id/${widgetConfig.layout.refreshCounter.id}"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_marginTop="8dp"
        android:text="${widgetConfig.layout.refreshCounter.defaultText}"
        android:textSize="${widgetConfig.layout.refreshCounter.textSize}"
        android:textColor="${widgetConfig.layout.refreshCounter.textColor}" />

</LinearLayout>`;

  return layout;
};

// Generate weather_widget_info.xml
const generateWidgetInfo = () => {
  return `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="110dp"
    android:minHeight="40dp"
    android:updatePeriodMillis="1800000"
    android:initialLayout="@layout/weather_widget"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen">
</appwidget-provider>`;
};

// Generate WeatherCache.kt
const generateWeatherCache = () => {
  return `package com.betrweather.app.storage

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

    fun getLastUpdateTimeFormatted(): String {
        return try {
            val lastUpdate = getLastUpdateTime()
            if (lastUpdate == 0L) {
                "Never updated"
            } else {
                val date = java.util.Date(lastUpdate)
                val formatter = java.text.SimpleDateFormat("MMM dd, HH:mm", java.util.Locale.getDefault())
                formatter.timeZone = java.util.TimeZone.getDefault()
                "Updated: \${formatter.format(date)}"
            }
        } catch (e: Exception) {
            Log.e("WeatherCache", "Error formatting last update time", e)
            "Update time error"
        }
    }
}

data class WeatherData(
    val temperature: String,
    val condition: String,
    val icon: String,
    val timestamp: Long
)`;
};

// Generate WeatherWidgetProvider.kt
const generateWeatherWidgetProvider = () => {
  return `package com.betrweather.app.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.util.Log
import android.widget.RemoteViews
import com.betrweather.app.MainActivity
import com.betrweather.app.R
import com.betrweather.app.storage.WeatherCache
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.ExistingPeriodicWorkPolicy
import java.util.concurrent.TimeUnit
import com.betrweather.app.storage.CacheMonitorManager

class WeatherWidgetProvider : AppWidgetProvider() {
    
    companion object {
        private const val TAG = "WeatherWidgetProvider"
        private const val ACTION_WIDGET_CLICK = "WIDGET_CLICK"
    }

    override fun onEnabled(context: Context) {
        super.onEnabled(context)
        Log.d(TAG, "First widget added - starting background services")

        val weatherWorkRequest = PeriodicWorkRequestBuilder<com.betrweather.app.worker.WeatherUpdateWorker>(
            15, TimeUnit.MINUTES
        ).build()

        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            "weather_updates",
            ExistingPeriodicWorkPolicy.REPLACE,
            weatherWorkRequest
        )

        CacheMonitorManager.start()
        Log.d(TAG, "Weather update worker scheduled + cache monitor started")
    }

    override fun onDisabled(context: Context) {
        super.onDisabled(context)
        Log.d(TAG, "Last widget removed - stopping background services")

        WorkManager.getInstance(context).cancelUniqueWork("weather_updates")
        Log.d(TAG, "Weather update worker cancelled (CacheMonitor keeps running)")
    }
    
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        Log.d(TAG, "Widget update requested for \${appWidgetIds.size} widgets")
        
        for (appWidgetId in appWidgetIds) {
            updateWeatherWidget(context, appWidgetManager, appWidgetId)
        }
    }
    
    private fun updateWeatherWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        try {
            val weatherCache = WeatherCache(context)
            val weatherData = weatherCache.getWeather()
            val lastUpdateFormatted = weatherCache.getLastUpdateTimeFormatted()
            
            if (weatherData != null) {
                Log.d(TAG, "This is the weather found: \${weatherData.temperature}, \${weatherData.condition}")
                
                val views = RemoteViews(context.packageName, R.layout.weather_widget)
                
                views.setTextViewText(R.id.temperature_text, weatherData.temperature)
                views.setTextViewText(R.id.condition_text, weatherData.condition)
                views.setTextViewText(R.id.refresh_counter_text, lastUpdateFormatted)
                
                val intent = Intent(context, MainActivity::class.java)
                intent.action = ACTION_WIDGET_CLICK
                val pendingIntent = PendingIntent.getActivity(
                    context, 0, intent, 
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.widget_container, pendingIntent)
                
                appWidgetManager.updateAppWidget(appWidgetId, views)
                Log.d(TAG, "Widget updated successfully with weather data")
                
            } else {
                Log.d(TAG, "No weather data available for widget")
                
                val views = RemoteViews(context.packageName, R.layout.weather_widget)
                views.setTextViewText(R.id.temperature_text, "No Data")
                views.setTextViewText(R.id.condition_text, "Tap to refresh")
                views.setTextViewText(R.id.refresh_counter_text, lastUpdateFormatted)
                
                val intent = Intent(context, MainActivity::class.java)
                intent.action = ACTION_WIDGET_CLICK
                val pendingIntent = PendingIntent.getActivity(
                    context, 0, intent, 
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.widget_container, pendingIntent)
                
                appWidgetManager.updateAppWidget(appWidgetId, views)
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Error updating widget", e)
        }
    }
}`;
};

// Generate WeatherUpdateWorker.kt
const generateWeatherUpdateWorker = () => {
  return `package com.betrweather.app.worker

import android.content.Context
import android.util.Log
import androidx.work.*
import com.betrweather.app.storage.WeatherCache
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.Task
import kotlinx.coroutines.*
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit
import com.betrweather.app.storage.WeatherData
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlin.coroutines.suspendCoroutine
import android.Manifest
import android.content.pm.PackageManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import androidx.core.app.NotificationCompat

class WeatherUpdateWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {
    
    companion object {
        private const val TAG = "WeatherUpdateWorker"
        private const val WORK_NAME = "weather_update_worker"
        
        fun schedulePeriodicUpdates(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .setRequiresBatteryNotLow(false)
                .build()
            
            val weatherWorkRequest = PeriodicWorkRequestBuilder<WeatherUpdateWorker>(
                15, TimeUnit.MINUTES // 15 minutes
            )
                .setConstraints(constraints)
                .setBackoffCriteria(BackoffPolicy.LINEAR, 10, TimeUnit.MINUTES)
                .build()
            
            WorkManager.getInstance(context)
                .enqueueUniquePeriodicWork(
                    WORK_NAME,
                    ExistingPeriodicWorkPolicy.KEEP,
                    weatherWorkRequest
                )
            
            Log.d(TAG, "Periodic weather updates scheduled every 15 minutes")
        }
        
        fun cancelUpdates(context: Context) {
            WorkManager.getInstance(context).cancelUniqueWork(WORK_NAME)
            Log.d(TAG, "Periodic weather updates cancelled")
        }
    }
    
    private val weatherCache = WeatherCache(context)
    private val fusedLocationClient: FusedLocationProviderClient = LocationServices.getFusedLocationProviderClient(context)
    
    override suspend fun doWork(): Result {
        return try {
            Log.d(TAG, "Starting weather update work")
            
            // Get current location
            val location = getCurrentLocation()
            if (location != null) {
                Log.d(TAG, "Got location: \${location.first}, \${location.second}")
                
                // Fetch weather from your backend using location
                val weatherData = fetchWeatherFromAPI(location.first, location.second)
                if (weatherData != null) {
                    // Save weather data
                    weatherCache.saveWeather(
                        temp = weatherData.temperature,
                        condition = weatherData.condition,
                        icon = weatherData.icon,
                        timestamp = System.currentTimeMillis()
                    )
                    
                    // Save location separately (without named parameters)
                    val lastLocation = weatherCache.getLastLocation()
                    if (lastLocation != null) {
                        weatherCache.saveLastLocation(lastLocation.first, lastLocation.second)
                    }
                    
                    Log.d(TAG, "Weather data saved successfully")
                } else {
                    Log.w(TAG, "No weather data to save")
                }
                
                Log.d(TAG, "Weather update completed successfully")
                Result.success()
            } else {
                Log.w(TAG, "No location available")
                Result.retry()
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Error in weather update work", e)
            Result.retry()
        }
    }
    
    private suspend fun getCurrentLocation(): Pair<Double, Double>? {
        return suspendCoroutine { continuation ->
            try {
                val fusedLocationClient = LocationServices.getFusedLocationProviderClient(applicationContext)
                
                // Check location permission first
                if (applicationContext.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                    fusedLocationClient.lastLocation
                        .addOnSuccessListener { location ->
                            if (location != null) {
                                continuation.resume(Pair(location.latitude, location.longitude))
                            } else {
                                continuation.resume(null)
                            }
                        }
                        .addOnFailureListener { exception ->
                            Log.e(TAG, "Error getting location", exception)
                            continuation.resume(null)
                        }
                } else {
                    Log.w(TAG, "Location permission not granted")
                    continuation.resume(null)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error in getCurrentLocation", e)
                continuation.resume(null)
            }
        }
    }
    
    private suspend fun fetchWeatherFromAPI(latitude: Double, longitude: Double): WeatherData? {
        return try {
            val client = OkHttpClient()
            
            // Your backend API endpoint for Google weather data
            val url = "https://data.endcorp.co/shortx/weather/current-conditions-widget?lat=$latitude&lon=$longitude"
                        
            Log.d(TAG, "Making API request to: $url")
            
            val request = Request.Builder()
                .url(url)
                .addHeader("Content-Type", "application/json")
                .build()
            
            val response = client.newCall(request).execute()
            
            if (response.isSuccessful) {
                val responseBody = response.body?.string()
                Log.d(TAG, "API response: $responseBody")
                
                // Parse your actual API response
                val weatherData = parseWeatherResponse(responseBody)
                weatherData
            } else {
                Log.e(TAG, "API call failed: \${response.code}")
                null
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Error making API call", e)
            null
        }
    }
    
    private fun parseWeatherResponse(responseBody: String?): WeatherData? {
        return try {
            if (responseBody != null) {
                // Parse the JSON response
                val jsonObject = org.json.JSONObject(responseBody)
                
                // Navigate through the nested structure
                val data = jsonObject.getJSONObject("data")
                val weatherData = data.getJSONObject("data")
                
                // Extract temperature
                val temperatureObj = weatherData.getJSONObject("temperature")
                val tempDegrees = temperatureObj.getInt("degrees")
                val tempUnit = temperatureObj.getString("unit")
                
                // Format temperature with unit
                val temperature = when (tempUnit) {
                    "CELSIUS" -> "\${tempDegrees}°C"
                    "FAHRENHEIT" -> "\${tempDegrees}°F"
                    else -> "\${tempDegrees}°"
                }
                
                // Extract weather condition
                val weatherCondition = weatherData.getJSONObject("weatherCondition")
                val description = weatherCondition.getJSONObject("description")
                val condition = description.getString("text")
                
                // Extract weather type for icon mapping
                val weatherType = weatherCondition.getString("type")
                val icon = mapWeatherTypeToIcon(weatherType)
                
                // Extract additional useful data
                val isDaytime = weatherData.getBoolean("isDaytime")
                
                Log.d(TAG, "Parsed weather data: $temperature, $condition, $icon, Daytime: $isDaytime")
                
                WeatherData(
                    temperature = temperature,
                    condition = condition,
                    icon = icon,
                    // latitude = latitude,
                    // longitude = longitude,
                    timestamp = System.currentTimeMillis()
                )
                
            } else {
                Log.w(TAG, "Response body is null")
                null
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing weather response", e)
            null
        }
    }
    
    private fun mapWeatherTypeToIcon(weatherType: String): String {
        return when (weatherType) {
            "CLEAR" -> "clear"
            "PARTLY_CLOUDY" -> "partly_cloudy"
            "MOSTLY_CLOUDY" -> "mostly_cloudy"
            "CLOUDY" -> "cloudy"
            "RAIN" -> "rain"
            "RAIN_SHOWERS" -> "rain_showers"
            "THUNDERSTORMS" -> "thunderstorms"
            "SNOW" -> "snow"
            "SLEET" -> "sleet"
            "FOG" -> "fog"
            "HAZE" -> "haze"
            "WINDY" -> "windy"
            "DUST" -> "dust"
            "SAND" -> "sand"
            "SMOKE" -> "smoke"
            else -> "unknown"
        }
    }
}

// Extension function to await Task
suspend fun <T> Task<T>.await(): T? {
    return suspendCoroutine { continuation ->
        addOnCompleteListener { task ->
            if (task.isSuccessful) {
                continuation.resume(task.result)
            } else {
                continuation.resumeWithException(task.exception ?: Exception("Task failed"))
            }
        }
    }
}
`;
};

// Generate CacheMonitor.kt
const generateCacheMonitor = () => {
  return `package com.betrweather.app.storage

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
                    Log.d("CacheMonitor", "Widget update broadcast sent for \${ids.size} widgets")
                } else {
                    Log.d("CacheMonitor", "No widgets to update")
                }
            }
        } catch (e: Exception) {
            Log.e("CacheMonitor", "Error in onSharedPreferenceChanged", e)
        }
    }
}
`;
};

// Generate CacheMonitorManager.kt
const generateCacheMonitorManager = () => {
  return `package com.betrweather.app.storage

import android.app.Application
import android.content.Context
import android.util.Log

object CacheMonitorManager {
    private const val TAG = "CacheMonitorManager"
    private var cacheMonitor: CacheMonitor? = null
    private var isInitialized = false
    
    fun initialize(application: Application) {
        if (!isInitialized) {
            cacheMonitor = CacheMonitor(application.applicationContext)
            cacheMonitor?.start()
            isInitialized = true
            Log.d(TAG, "CacheMonitor initialized with Application context")
        }
    }
    
    fun start() {
        if (isInitialized && cacheMonitor != null) {
            cacheMonitor?.start()
            Log.d(TAG, "CacheMonitor started")
        } else {
            Log.w(TAG, "CacheMonitor not initialized, cannot start")
        }
    }
    
    fun stop() {
        cacheMonitor?.stop()
        Log.d(TAG, "CacheMonitor stopped")
    }
    
    fun isRunning(): Boolean {
        return cacheMonitor != null && isInitialized
    }
}
`;
};

// Generate AndroidManifest.xml additions
const generateManifestAdditions = () => {
  return `    <!-- Weather Widget -->
    <receiver android:name=".widget.WeatherWidgetProvider"
        android:exported="true">
        <intent-filter>
            <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
        </intent-filter>
        <meta-data
            android:name="android.appwidget.provider"
            android:resource="@xml/weather_widget_info" />
    </receiver>

    <!-- Weather Update Worker -->
    <provider
        android:name="androidx.startup.InitializationProvider"
        android:authorities="\${applicationId}.androidx-startup"
        android:exported="false">
        <meta-data
            android:name="androidx.work.WorkManagerInitializer"
            android:value="androidx.startup" />
    </provider>`;
};

// Add this new function to modify build.gradle
const modifyBuildGradle = () => {
    const buildGradlePath = path.join(__dirname, '../android/app/build.gradle');
    
    if (!fs.existsSync(buildGradlePath)) {
      console.log('Warning: build.gradle not found, skipping dependency modifications');
      return;
    }
    
    try {
      let content = fs.readFileSync(buildGradlePath, 'utf8');
      
      // Check if dependencies are already added
      if (content.includes('com.squareup.okhttp3:okhttp')) {
        console.log('Dependencies already present in build.gradle, skipping...');
        return;
      }
      
      // Find the dependencies block
      const dependenciesPattern = /dependencies\s*\{/;
      if (dependenciesPattern.test(content)) {
        // Add dependencies after the dependencies { line
        const newDependencies = `
      // For HTTP requests
      implementation 'com.squareup.okhttp3:okhttp:4.9.3'
      
      // For JSON parsing
      implementation 'com.google.code.gson:gson:2.8.9'
      
      // WorkManager for background tasks
      implementation "androidx.work:work-runtime-ktx:2.9.0"
      
      // Google Play Services for location
      implementation "com.google.android.gms:play-services-location:21.0.1"
      
      // Kotlin coroutines
      implementation "org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.1"
      implementation "org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.7.1"
  `;
        
        content = content.replace(
          /dependencies\s*\{/,
          `dependencies {${newDependencies}`
        );
        
        fs.writeFileSync(buildGradlePath, content);
        console.log('✅ Dependencies added to build.gradle');
      } else {
        console.log('Warning: Could not find dependencies block in build.gradle');
      }
    } catch (error) {
      console.error('Error modifying build.gradle:', error);
    }
  };

  // Add this new function to modify AndroidManifest.xml
const modifyAndroidManifest = () => {
    const manifestPath = path.join(__dirname, '../android/app/src/main/AndroidManifest.xml');
    
    if (!fs.existsSync(manifestPath)) {
      console.log('Warning: AndroidManifest.xml not found, skipping manifest modifications');
      return;
    }
    
    try {
      let content = fs.readFileSync(manifestPath, 'utf8');
      
      // Check if widget receiver is already added
      if (content.includes('WeatherWidgetProvider')) {
        console.log('Widget receiver already present in AndroidManifest.xml, skipping...');
        return;
      }
      
      // Find the application tag
      const applicationPattern = /<application[^>]*>/;
      if (applicationPattern.test(content)) {
        // Add widget receiver and permissions before the closing </application> tag
        const widgetManifest = `
      <!-- Weather Widget -->
      <receiver android:name=".widget.WeatherWidgetProvider"
          android:exported="true">
          <intent-filter>
              <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
          </intent-filter>
          <meta-data
              android:name="android.appwidget.provider"
              android:resource="@xml/weather_widget_info" />
      </receiver>
  
      <!-- Weather Update Worker -->
      <provider
          android:name="androidx.startup.InitializationProvider"
          android:authorities="\${applicationId}.androidx-startup"
          android:exported="false">
          <meta-data
              android:name="androidx.work.WorkManagerInitializer"
              android:value="androidx.startup" />
      </provider>`;
        
        // Add before closing </application> tag
        content = content.replace(
          /<\/application>/,
          `${widgetManifest}
  </application>`
        );
        
        // Add permissions if they don't exist
        const permissionsToAdd = [
          'android.permission.ACCESS_COARSE_LOCATION',
          'android.permission.ACCESS_FINE_LOCATION',
          'android.permission.INTERNET',
          'android.permission.ACCESS_BACKGROUND_LOCATION'
        ];
        
        permissionsToAdd.forEach(permission => {
          if (!content.includes(permission)) {
            // Add permission after the opening <manifest> tag
            content = content.replace(
              /<manifest[^>]*>/,
              `$&
      <uses-permission android:name="${permission}" />`
            );
          }
        });
        
        fs.writeFileSync(manifestPath, content);
        console.log('✅ Widget receiver and permissions added to AndroidManifest.xml');
      } else {
        console.log('Warning: Could not find application tag in AndroidManifest.xml');
      }
    } catch (error) {
      console.error('Error modifying AndroidManifest.xml:', error);
    }
  };


  const modifyMainApplication = () => {
    const mainApplicationPath = path.join(__dirname, '../android/app/src/main/java/com/betrweather/app/MainApplication.kt');
    
    if (!fs.existsSync(mainApplicationPath)) {
      console.log('Warning: MainApplication.kt not found, skipping modifications');
      return;
    }
  
    try {
      let content = fs.readFileSync(mainApplicationPath, 'utf8');
  
      // Check if CacheMonitorManager is already imported
      if (content.includes('import com.betrweather.app.storage.CacheMonitorManager')) {
        console.log('CacheMonitorManager import already present in MainApplication.kt, skipping...');
        return;
      }
  
      // Add import for CacheMonitorManager
      content = content.replace(
        /import expo\.modules\.ReactNativeHostWrapper/,
        `import expo.modules.ReactNativeHostWrapper
  import com.betrweather.app.storage.CacheMonitorManager`
      );
  
      // Check if CacheMonitorManager.start() is already present
      if (content.includes('CacheMonitorManager.start()')) {
        console.log('CacheMonitorManager.start() already present in MainApplication.kt, skipping...');
        return;
      }
  
      // Add CacheMonitorManager.initialize() and CacheMonitorManager.start() after ApplicationLifecycleDispatcher.onApplicationCreate(this)
      content = content.replace(
        /ApplicationLifecycleDispatcher\.onApplicationCreate\(this\)/,
        `ApplicationLifecycleDispatcher.onApplicationCreate(this)
  
      // Initialize CacheMonitor with Application context
      CacheMonitorManager.initialize(this)
  
      // Start monitoring immediately
      CacheMonitorManager.start()`
      );
  
      fs.writeFileSync(mainApplicationPath, content);
      console.log('✅ CacheMonitorManager import and initialization added to MainApplication.kt');
    } catch (error) {
      console.error('Error modifying MainApplication.kt:', error);
    }
  };
  

// Main function to generate all files
const generateAndroidFiles = () => {
  const androidDir = path.join(__dirname, '../android/app/src/main');
  
  // Ensure directories exist
  const dirs = [
    path.join(androidDir, 'res/layout'),
    path.join(androidDir, 'res/xml'),
    path.join(androidDir, 'java/com/betrweather/app/widget'),
    path.join(androidDir, 'java/com/betrweather/app/storage'),
    path.join(androidDir, 'java/com/betrweather/app/worker')
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Generate all files
  const files = [
    {
      path: path.join(androidDir, 'res/layout/weather_widget.xml'),
      content: generateWidgetLayout()
    },
    {
      path: path.join(androidDir, 'res/xml/weather_widget_info.xml'),
      content: generateWidgetInfo()
    },
    {
      path: path.join(androidDir, 'java/com/betrweather/app/storage/WeatherCache.kt'),
      content: generateWeatherCache()
    },
    {
      path: path.join(androidDir, 'java/com/betrweather/app/widget/WeatherWidgetProvider.kt'),
      content: generateWeatherWidgetProvider()
    },
    {
      path: path.join(androidDir, 'java/com/betrweather/app/worker/WeatherUpdateWorker.kt'),
      content: generateWeatherUpdateWorker()
    },
    {
      path: path.join(androidDir, 'java/com/betrweather/app/storage/CacheMonitor.kt'),
      content: generateCacheMonitor()
    },
    {
      path: path.join(androidDir, 'java/com/betrweather/app/storage/CacheMonitorManager.kt'),
      content: generateCacheMonitorManager()
    }
  ];
  
  files.forEach(file => {
    fs.writeFileSync(file.path, file.content);
    console.log(`Generated: ${path.relative(androidDir, file.path)}`);
  });

    // Modify build.gradle to add dependencies
    modifyBuildGradle();
  
    // Modify AndroidManifest.xml to add widget receiver and permissions
    modifyAndroidManifest();

    //modify MainApplication.kt to add CacheMonitorManager.start()
    modifyMainApplication();

  console.log('\\nNote: You may need to manually add the manifest additions to your AndroidManifest.xml file.');
  console.log('Look for the "<!-- Weather Widget -->" section in the generated output above.');
};

generateAndroidFiles();
console.log('Android widget files generated successfully!');
