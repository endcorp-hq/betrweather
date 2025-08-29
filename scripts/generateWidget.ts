import path from "path";
import fs from "fs";

const modifyBuildGradle = () => {
  const buildGradlePath = path.join(__dirname, "../android/app/build.gradle");

  if (!fs.existsSync(buildGradlePath)) {
    console.log(
      "Warning: build.gradle not found, skipping dependency modifications"
    );
    return;
  }

  try {
    let content = fs.readFileSync(buildGradlePath, "utf8");

    // Check if dependencies are already added
    if (content.includes("androidx.work:work-runtime-ktx")) {
      console.log("Dependencies already present in build.gradle, skipping...");
      return;
    }

    // Find the dependencies block
    const dependenciesPattern = /dependencies\s*\{/;
    if (dependenciesPattern.test(content)) {
      // Add dependencies after the dependencies { line
      const newDependencies = `        
        // WorkManager for background tasks
        implementation "androidx.work:work-runtime-ktx:2.10.3"
              
        // For JSON parsing
        implementation 'com.google.code.gson:gson:2.8.9'
        
        // OkHttp for API calls
        implementation "com.squareup.okhttp3:okhttp:4.9.3"
        
        // Google Play Services for location
        implementation "com.google.android.gms:play-services-location:+"
        
        // Kotlin coroutines
        implementation "org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.1"
        implementation "org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.7.1"
    `;

      content = content.replace(
        /dependencies\s*\{/,
        `dependencies {${newDependencies}`
      );

      fs.writeFileSync(buildGradlePath, content);
      console.log("✅ Dependencies added to build.gradle");
    } else {
      console.log("Warning: Could not find dependencies block in build.gradle");
    }
  } catch (error) {
    console.error("Error modifying build.gradle:", error);
  }
};

// Add this new function to modify AndroidManifest.xml
const modifyAndroidManifest = () => {
  const manifestPath = path.join(
    __dirname,
    "../android/app/src/main/AndroidManifest.xml"
  );

  if (!fs.existsSync(manifestPath)) {
    console.log(
      "Warning: AndroidManifest.xml not found, skipping manifest modifications"
    );
    return;
  }

  try {
    let content = fs.readFileSync(manifestPath, "utf8");

    // Check if widget receiver is already added
    if (content.includes("WeatherWidgetProvider")) {
      console.log(
        "Widget receiver already present in AndroidManifest.xml, skipping..."
      );
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
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.INTERNET",
        "android.permission.ACCESS_BACKGROUND_LOCATION",
      ];

      permissionsToAdd.forEach((permission) => {
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
      console.log(
        "✅ Widget receiver and permissions added to AndroidManifest.xml"
      );
    } else {
      console.log(
        "Warning: Could not find application tag in AndroidManifest.xml"
      );
    }
  } catch (error) {
    console.error("Error modifying AndroidManifest.xml:", error);
  }
};

const modifyMainApplication = () => {
  const mainApplicationPath = path.join(
    __dirname,
    "../android/app/src/main/java/com/betrweather/app/MainApplication.kt"
  );

  if (!fs.existsSync(mainApplicationPath)) {
    console.log(
      "Warning: MainApplication.kt not found, skipping modifications"
    );
    return;
  }

  try {
    let content = fs.readFileSync(mainApplicationPath, "utf8");

    // Remove any existing WorkManager scheduling
    if (content.includes("WeatherUpdateWorker")) {
      console.log(
        "WorkManager already configured, skipping MainApplication modifications"
      );
      return;
    }

    console.log("✅ MainApplication.kt - no WorkManager scheduling needed");
  } catch (error) {
    console.error("Error modifying MainApplication.kt:", error);
  }
};

const weatherUpdateWorker = `package com.betrweather.app.worker

import android.content.Context
import android.content.Intent
import android.location.Location
import android.location.LocationManager
import android.location.LocationListener
import android.os.Bundle
import android.util.Log
import androidx.work.Worker
import androidx.work.WorkerParameters
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.Task
import kotlinx.coroutines.*
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlin.coroutines.suspendCoroutine
import kotlin.coroutines.Continuation
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.TimeUnit
import android.net.Uri
import android.Manifest
import android.content.pm.PackageManager
import android.provider.Settings

class WeatherUpdateWorker(
    private val context: Context,
    params: WorkerParameters
) : Worker(context, params) {

    companion object {
        private const val TAG = "WeatherUpdateWorker"
        private const val COLLISION_THRESHOLD_MS = 30000L // 30 seconds
        
        // Static flag to prevent multiple workers from running simultaneously
        private val isWorkerRunning = AtomicBoolean(false)
    }

    private val workerId = UUID.randomUUID().toString().substring(0, 8)
    private val fusedLocationClient: FusedLocationProviderClient by lazy {
        LocationServices.getFusedLocationProviderClient(context)
    }
    
    // LocationManager for fallback location services
    private val locationManager: LocationManager by lazy {
        context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
    }

    override fun doWork(): Result = runBlocking {
        val currentTime = SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date())
        Log.d(TAG, "[Worker-$workerId] WeatherUpdateWorker started at $currentTime")
        
        try {
            // Use atomic boolean to prevent multiple workers from running simultaneously
            if (!isWorkerRunning.compareAndSet(false, true)) {
                Log.d(TAG, "[Worker-$workerId] Another worker is already running, skipping execution")
                return@runBlocking Result.success()
            }
            
            try {
                // Get current location with fallback strategy and caching
                val location = getCurrentLocationWithFallbackAndCache()
                if (location != null) {
                    Log.d(TAG, "[Worker-$workerId] Location obtained: \${location.first}, \${location.second}")
                    
                    // Update location cache with successful location
                    updateLocationCache(location.first, location.second)
                    
                    // Fetch weather
                    val weatherData = fetchWeatherFromAPI(location.first, location.second)
                    if (weatherData != null) {
                        Log.d(TAG, "[Worker-$workerId] Weather data fetched successfully: \${weatherData.temperature}, \${weatherData.condition}")
                        
                        // Update widgets with success data (no error)
                        val successWeatherData = weatherData.copy(hasError = false)
                        updateWidgetsDirectly(successWeatherData)
                    } else {
                        Log.w(TAG, "[Worker-$workerId] Failed to fetch weather data")
                        
                        // Update widgets with error state
                        val errorWeatherData = WeatherData(
                            temperature = "N/A",
                            condition = "Weather Unavailable",
                            isDaytime = true,
                            icon = "",
                            precipitationProbability = "0",
                            precipitationType = "NONE",
                            hasError = true
                        )
                        updateWidgetsDirectly(errorWeatherData)
                    }
                } else {
                    Log.w(TAG, "[Worker-$workerId] Failed to get location from all providers")
                    
                    // Update widgets with error state
                    val errorWeatherData = WeatherData(
                        temperature = "N/A",
                        condition = "Location Unavailable",
                        isDaytime = true,
                        icon = "",
                        precipitationProbability = "0",
                        precipitationType = "NONE",
                        hasError = true
                    )
                    updateWidgetsDirectly(errorWeatherData)
                }
                
                Log.d(TAG, "[Worker-$workerId] WeatherUpdateWorker completed successfully at $currentTime")
                Result.success()
            } finally {
                // Always release the lock
                isWorkerRunning.set(false)
            }
        } catch (error: Exception) {
            Log.e(TAG, "[Worker-$workerId] Error in WeatherUpdateWorker", error)
            
            // Update widgets with error state
            val errorWeatherData = WeatherData(
                temperature = "N/A",
                condition = "Update Failed",
                isDaytime = true,
                icon = "",
                precipitationProbability = "0",
                precipitationType = "NONE",
                hasError = true
            )
            updateWidgetsDirectly(errorWeatherData)
            
            // Release the lock on error too
            isWorkerRunning.set(false)
            Result.failure()
        }
    }

    /**
     * Enhanced location retrieval with fallback strategy and caching:
     * 1. Try FusedLocationProviderClient first (most accurate)
     * 2. Fall back to LocationManager if FusedLocationProviderClient fails
     * 3. Use cached location if all providers fail
     * 4. Update cache on every successful location retrieval
     */
    private suspend fun getCurrentLocationWithFallbackAndCache(): Pair<Double, Double>? {
        return withContext(Dispatchers.IO) {
            try {
                // Check if we have location permission
                if (context.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != 
                    PackageManager.PERMISSION_GRANTED) {
                    Log.w(TAG, "[Worker-$workerId] Location permission not granted")
                    return@withContext getCachedLocation()
                }
                
                // First, try FusedLocationProviderClient (most reliable)
                val fusedLocation = getFusedLocation()
                if (fusedLocation != null) {
                    Log.d(TAG, "[Worker-$workerId] Successfully got location from FusedLocationProviderClient")
                    return@withContext fusedLocation
                }
                
                // Fallback to LocationManager if FusedLocationProviderClient fails
                Log.d(TAG, "[Worker-$workerId] FusedLocationProviderClient failed, trying LocationManager fallback")
                val locationManagerLocation = getLocationManagerLocation()
                if (locationManagerLocation != null) {
                    Log.d(TAG, "[Worker-$workerId] Successfully got location from LocationManager fallback")
                    return@withContext locationManagerLocation
                }
                
                // Final fallback: try to get location from cache
                Log.d(TAG, "[Worker-$workerId] All location providers failed, trying cached location")
                val cachedLocation = getCachedLocation()
                if (cachedLocation != null) {
                    Log.d(TAG, "[Worker-$workerId] Using cached location: \${cachedLocation.first}, \${cachedLocation.second}")
                    return@withContext cachedLocation
                }
                
                Log.w(TAG, "[Worker-$workerId] All location sources failed including cache")
                return@withContext null
                
            } catch (e: Exception) {
                Log.e(TAG, "[Worker-$workerId] Exception in getCurrentLocationWithFallbackAndCache", e)
                // Try cache as last resort
                getCachedLocation()
            }
        }
    }

    /**
     * Try to get location using FusedLocationProviderClient
     */
    private suspend fun getFusedLocation(): Pair<Double, Double>? {
        return suspendCoroutine { continuation ->
            try {
                val locationTask: Task<Location> = fusedLocationClient.getLastLocation()
                
                locationTask.addOnSuccessListener { location ->
                    if (location != null) {
                        Log.d(TAG, "[Worker-$workerId] FusedLocationProviderClient success: \${location.latitude}, \${location.longitude}")
                        continuation.resume(Pair(location.latitude, location.longitude))
                    } else {
                        Log.w(TAG, "[Worker-$workerId] FusedLocationProviderClient returned null")
                        continuation.resume(null)
                    }
                }.addOnFailureListener { exception ->
                    Log.e(TAG, "[Worker-$workerId] FusedLocationProviderClient failed", exception)
                    continuation.resume(null)
                }
                
            } catch (e: Exception) {
                Log.e(TAG, "[Worker-$workerId] Exception in getFusedLocation", e)
                continuation.resume(null)
            }
        }
    }

    /**
     * Fallback location retrieval using LocationManager
     * This is more reliable when FusedLocationProviderClient fails
     */
    private suspend fun getLocationManagerLocation(): Pair<Double, Double>? {
        return suspendCoroutine { continuation ->
            try {
                var provider = ""
                
                // Check which providers are available and enabled
                if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                    provider = LocationManager.GPS_PROVIDER
                    Log.d(TAG, "[Worker-$workerId] Using GPS provider")
                } else if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                    provider = LocationManager.NETWORK_PROVIDER
                    Log.d(TAG, "[Worker-$workerId] Using Network provider")
                }
                
                if (provider.isNotEmpty()) {
                    // Get last known location from the selected provider
                    val lastKnownLocation = locationManager.getLastKnownLocation(provider)
                    
                    if (lastKnownLocation != null) {
                        Log.d(TAG, "[Worker-$workerId] LocationManager success: \${lastKnownLocation.latitude}, \${lastKnownLocation.longitude}")
                        continuation.resume(Pair(lastKnownLocation.latitude, lastKnownLocation.longitude))
                    } else {
                        Log.w(TAG, "[Worker-$workerId] LocationManager lastKnownLocation is null")
                        
                        // Try to get current location with a timeout
                        getCurrentLocationWithTimeout(provider, continuation)
                    }
                } else {
                    Log.w(TAG, "[Worker-$workerId] No location providers available")
                    continuation.resume(null)
                }
                
            } catch (e: Exception) {
                Log.e(TAG, "[Worker-$workerId] Exception in getLocationManagerLocation", e)
                continuation.resume(null)
            }
        }
    }

    /**
     * Get current location with timeout using LocationManager
     */
    private fun getCurrentLocationWithTimeout(provider: String, continuation: Continuation<Pair<Double, Double>?>) {
        try {
            val locationListener = object : LocationListener {
                override fun onLocationChanged(location: Location) {
                    try {
                        Log.d(TAG, "[Worker-$workerId] LocationManager onLocationChanged: \${location.latitude}, \${location.longitude}")
                        locationManager.removeUpdates(this)
                        continuation.resume(Pair(location.latitude, location.longitude))
                    } catch (e: Exception) {
                        Log.e(TAG, "[Worker-$workerId] Error in onLocationChanged", e)
                        continuation.resume(null)
                    }
                }
                
                override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {
                    Log.d(TAG, "[Worker-$workerId] LocationManager status changed: $provider, status: $status")
                }
            }
            
            // Request location updates with timeout
            locationManager.requestLocationUpdates(provider, 0L, 0f, locationListener)
            
            // Set a timeout to prevent hanging
            CoroutineScope(Dispatchers.IO).launch {
                delay(10000L) // 10 second timeout
                try {
                    locationManager.removeUpdates(locationListener)
                    Log.w(TAG, "[Worker-$workerId] LocationManager timeout reached")
                    continuation.resume(null)
                } catch (e: Exception) {
                    Log.e(TAG, "[Worker-$workerId] Error in timeout handler", e)
                }
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "[Worker-$workerId] Exception in getCurrentLocationWithTimeout", e)
            continuation.resume(null)
        }
    }

    /**
     * Get location from cache (SharedPreferences)
     */
    private fun getCachedLocation(): Pair<Double, Double>? {
        return try {
            val sharedPrefs = context.getSharedPreferences("LocationCache", Context.MODE_PRIVATE)
            val lat = sharedPrefs.getFloat("cached_latitude", 0f)
            val lon = sharedPrefs.getFloat("cached_longitude", 0f)
            val timestamp = sharedPrefs.getLong("cached_timestamp", 0L)
            
            // Check if cache is valid (less than 24 hours old)
            val currentTime = System.currentTimeMillis()
            val cacheAge = currentTime - timestamp
            val maxCacheAge = 24 * 60 * 60 * 1000L // 24 hours in milliseconds
            
            if (lat != 0f && lon != 0f && cacheAge < maxCacheAge) {
                Log.d(TAG, "[Worker-$workerId] Using cached location: $lat, $lon (age: \${cacheAge / (60 * 60 * 1000)} hours)")
                Pair(lat.toDouble(), lon.toDouble())
            } else {
                if (lat == 0f || lon == 0f) {
                    Log.d(TAG, "[Worker-$workerId] No cached location available")
                } else {
                    Log.d(TAG, "[Worker-$workerId] Cached location expired (age: \${cacheAge / (60 * 60 * 1000)} hours)")
                }
                null
            }
        } catch (e: Exception) {
            Log.e(TAG, "[Worker-$workerId] Error reading cached location", e)
            null
        }
    }

    /**
     * Update location cache with new coordinates
     */
    private fun updateLocationCache(latitude: Double, longitude: Double) {
        try {
            val sharedPrefs = context.getSharedPreferences("LocationCache", Context.MODE_PRIVATE)
            sharedPrefs.edit()
                .putFloat("cached_latitude", latitude.toFloat())
                .putFloat("cached_longitude", longitude.toFloat())
                .putLong("cached_timestamp", System.currentTimeMillis())
                .apply()
            
            Log.d(TAG, "[Worker-$workerId] Location cache updated: $latitude, $longitude")
        } catch (e: Exception) {
            Log.e(TAG, "[Worker-$workerId] Error updating location cache", e)
        }
    }

    private suspend fun fetchWeatherFromAPI(latitude: Double, longitude: Double): WeatherData? {
        return withContext(Dispatchers.IO) {
            try {
                Log.d(TAG, "[Worker-$workerId] Creating OkHttp client...")
                val client = OkHttpClient.Builder()
                    .connectTimeout(15, TimeUnit.SECONDS)
                    .readTimeout(15, TimeUnit.SECONDS)
                    .build()
                
                val url = "https://data.endcorp.co/shortx/weather/current-conditions-widget?lat=$latitude&lon=$longitude"
                Log.d(TAG, "[Worker-$workerId] Making API request to: $url")
                
                val request = Request.Builder()
                    .url(url)
                    .get()
                    .build()
                
                Log.d(TAG, "[Worker-$workerId] Executing request...")
                
                // Use withTimeout to prevent hanging
                withTimeout(20_000L) { // 20 seconds timeout
                    val response = client.newCall(request).execute()
                    Log.d(TAG, "[Worker-$workerId] Response received: \${response.code}")
                    
                    if (response.isSuccessful) {
                        val responseBody = response.body?.string()
                        Log.d(TAG, "[Worker-$workerId] API response body length: \${responseBody?.length ?: 0}")
                        
                        // Parse your actual API response
                        val weatherData = parseWeatherResponse(responseBody)
                        if (weatherData != null) {
                            Log.d(TAG, "[Worker-$workerId] Weather data parsed successfully: \${weatherData.temperature}, \${weatherData.condition}")
                        } else {
                            Log.w(TAG, "[Worker-$workerId] Failed to parse weather response")
                        }
                        weatherData
                    } else {
                        Log.e(TAG, "[Worker-$workerId] API call failed: \${response.code}")
                        null
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "[Worker-$workerId] Exception in fetchWeatherFromAPI", e)
                null
            }
        }
    }

    private fun parseWeatherResponse(responseBody: String?): WeatherData? {
        return try {
            val jsonObject = JSONObject(responseBody ?: return null)
            val data = jsonObject.optJSONObject("data")?.optJSONObject("data") ?: return null
            
            // Extract temperature
            val temperatureObj = data.optJSONObject("temperature")
            val tempDegrees = temperatureObj?.optDouble("degrees", 0.0)
            val tempUnit = temperatureObj?.optString("unit", "CELSIUS")
            
            // Extract weather condition
            val weatherCondition = data.optJSONObject("weatherCondition")
            val description = weatherCondition?.optJSONObject("description")?.optString("text")
            
            // Extract icon
            val iconBaseUri = weatherCondition?.optString("iconBaseUri", "")
            val icon = if (!iconBaseUri.isNullOrEmpty()) "$iconBaseUri.svg" else ""
            
            // Extract precipitation
            val precipitation = data.optJSONObject("precipitation")
            val precipitationProbability = precipitation?.optJSONObject("probability")?.optString("percent", "0") ?: "0"
            val precipitationType = precipitation?.optJSONObject("probability")?.optString("type", "RAIN") ?: "RAIN"
            
            // Check if it's daytime
            val isDaytime = data.optBoolean("isDaytime", true)
            
            Log.d(TAG, "[Worker-$workerId] JSON parsed successfully")
            Log.d(TAG, "[Worker-$workerId] Parsed weather data: \${tempDegrees}°C, $description, Daytime: $isDaytime")
            
            // Format temperature with unit
            val formattedTemperature = when (tempUnit) {
                "CELSIUS" -> "\${tempDegrees}°C"
                "FAHRENHEIT" -> "\${tempDegrees}°F"
                else -> "\${tempDegrees}°"
            }
            
            WeatherData(
                temperature = formattedTemperature,
                condition = description ?: "Unknown",
                isDaytime = isDaytime,
                icon = icon,
                precipitationProbability = precipitationProbability,
                precipitationType = precipitationType
            )
        } catch (e: Exception) {
            Log.e(TAG, "[Worker-$workerId] Exception parsing weather response", e)
            null
        }
    }

    private suspend fun updateWidgetsDirectly(weatherData: WeatherData) {
        withContext(Dispatchers.Main) {
            try {
                // Format current date as "Tue, May 22"
                val currentDate = SimpleDateFormat("EEE, MMM dd", Locale.ENGLISH).format(Date())
                
                // Update widgets directly using AppWidgetManager
                val appWidgetManager = android.appwidget.AppWidgetManager.getInstance(context)
                val appWidgetIds = appWidgetManager.getAppWidgetIds(
                    android.content.ComponentName(context, com.betrweather.app.widget.WeatherWidgetProvider::class.java)
                )
                
                if (appWidgetIds.isNotEmpty()) {
                    for (appWidgetId in appWidgetIds) {
                        val views = android.widget.RemoteViews(context.packageName, com.betrweather.app.R.layout.widget_layout)
                        
                        // Set weather icon from API
                        // try {
                        //     if (!weatherData.icon.isNullOrEmpty()) {
                        //         val iconUri = Uri.parse(weatherData.icon)
                        //         views.setImageViewUri(com.betrweather.app.R.id.weather_icon, iconUri)
                        //         Log.d(TAG, "[Worker-$workerId] Weather icon set: \${weatherData.icon}")
                        //     } else {
                        //         // Fallback to default icon if no icon URI
                        //         views.setImageViewResource(com.betrweather.app.R.id.weather_icon, android.R.drawable.ic_menu_view)
                        //     }
                        // } catch (e: Exception) {
                        //     Log.w(TAG, "[Worker-$workerId] Failed to set weather icon: \${e.message}")
                        //     // Fallback to default icon if URI fails
                        //     views.setImageViewResource(com.betrweather.app.R.id.weather_icon, android.R.drawable.ic_menu_view)
                        // }
                        
                        // Set other weather data
                        views.setTextViewText(com.betrweather.app.R.id.current_date_text, "$currentDate")
                        // views.setImageViewResource(com.betrweather.app.R.id.weather_icon, com.betrweather.app.R.drawable.\${weatherData.icon})
                        views.setTextViewText(com.betrweather.app.R.id.weather_temp_text, "\${weatherData.temperature.replace(Regex("""\.\d+"""), "")}")
                        views.setTextViewText(com.betrweather.app.R.id.weather_description_text, "\${weatherData.condition}")
                        
                        // Set last updated time
                        val lastUpdateTime = SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date())
                        views.setTextViewText(com.betrweather.app.R.id.last_update_text, "Last Updated: $lastUpdateTime")
                        
                        // Show/hide error indicator based on error state
                        if (weatherData.hasError) {
                            views.setViewVisibility(com.betrweather.app.R.id.error_indicator, android.view.View.VISIBLE)
                            Log.d(TAG, "[Worker-$workerId] Error indicator shown")
                        } else {
                            views.setViewVisibility(com.betrweather.app.R.id.error_indicator, android.view.View.GONE)
                            Log.d(TAG, "[Worker-$workerId] Error indicator hidden")
                        }
                        
                        appWidgetManager.updateAppWidget(appWidgetId, views)
                    }
                    
                    Log.d(TAG, "[Worker-$workerId] Widgets updated directly with weather data: \${weatherData.temperature}, \${weatherData.condition}, $currentDate")
                } else {
                    Log.d(TAG, "[Worker-$workerId] No widgets found to refresh")
                }
            } catch (e: Exception) {
                Log.e(TAG, "[Worker-$workerId] Exception updating widgets directly", e)
            }
        }
    }

    data class WeatherData(
        val temperature: String,
        val condition: String,
        val isDaytime: Boolean,
        val icon: String,
        val precipitationProbability: String,
        val precipitationType: String,
        val hasError: Boolean = false  // Add error flag
    )
}`;

const weatherWidgetProvider = `package com.betrweather.app.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.util.Log
import android.widget.RemoteViews
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkRequest
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.WorkInfo
import com.betrweather.app.MainActivity
import com.betrweather.app.R
import com.betrweather.app.worker.WeatherUpdateWorker
import java.util.concurrent.TimeUnit

class WeatherWidgetProvider : AppWidgetProvider() {
    companion object {
        private const val TAG = "WeatherWidgetProvider"
        private const val ACTION_WIDGET_UPDATE = "com.betrweather.app.WIDGET_UPDATE"
        private const val WORK_NAME = "weather_update_work"
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        Log.d(TAG, "onUpdate called for \${appWidgetIds.size} widgets")
        
        // Start WorkManager if not already running
        startWeatherUpdateWork(context)
        
        // Trigger immediate weather update for fresh data
        triggerImmediateWeatherUpdate(context)
    }

    private fun startWeatherUpdateWork(context: Context) {
        try {
            val workManager = WorkManager.getInstance(context)
            
            // Use unique work name to prevent duplicates
            val weatherWorkRequest = PeriodicWorkRequestBuilder<WeatherUpdateWorker>(
                15, TimeUnit.MINUTES
            ).addTag("weather_update").build()
            
            workManager.enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                weatherWorkRequest
            )
            
            Log.d(TAG, "Weather update work scheduled")
        } catch (e: Exception) {
            Log.e(TAG, "Error starting weather update work: \${e.message}")
        }
    }

    private fun triggerImmediateWeatherUpdate(context: Context) {
        try {
            val workManager = WorkManager.getInstance(context)
            val immediateWorkRequest = OneTimeWorkRequestBuilder<WeatherUpdateWorker>()
                .addTag("immediate_weather_update")
                .build()
            
            workManager.enqueue(immediateWorkRequest)
            Log.d(TAG, "Immediate weather update work enqueued")
        } catch (e: Exception) {
            Log.e(TAG, "Error enqueueing immediate weather update: \${e.message}")
        }
    }

    override fun onDisabled(context: Context) {
        super.onDisabled(context)
        Log.d(TAG, "onDisabled called - stopping weather update work")
        
        try {
            val workManager = WorkManager.getInstance(context)
            workManager.cancelAllWorkByTag("weather_update")
            workManager.cancelUniqueWork(WORK_NAME)
            Log.d(TAG, "Weather update work cancelled")
        } catch (e: Exception) {
            Log.e(TAG, "Error cancelling weather update work: \${e.message}")
        }
    }

    // override fun onReceive(context: Context, intent: Intent) {
    //     super.onReceive(context, intent)
        
    //     if (ACTION_WIDGET_UPDATE == intent.action) {
    //         Log.d(TAG, "Received widget update broadcast")
    //         val appWidgetManager = AppWidgetManager.getInstance(context)
    //         val appWidgetIds = appWidgetManager.getAppWidgetIds(
    //             ComponentName(context, WeatherWidgetProvider::class.java)
    //         )
            
    //         // Update all widgets
    //         for (appWidgetId in appWidgetIds) {
    //             updateAppWidget(context, appWidgetManager, appWidgetId)
    //         }
    //     }
    // }

    // private fun updateAppWidget(
    //     context: Context,
    //     appWidgetManager: AppWidgetManager,
    //     appWidgetId: Int
    // ) {
    //     try {
    //         // Create RemoteViews for the widget
    //         val views = RemoteViews(context.packageName, R.layout.widget_layout)
            
    //         // Set click listener to open the app
    //         val intent = Intent(context, MainActivity::class.java)
    //         val pendingIntent = PendingIntent.getActivity(
    //             context,
    //             0,
    //             intent,
    //             PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    //         )
    //         views.setOnClickPendingIntent(R.id.widget_container, pendingIntent)
            
    //         // Update widget UI with weather data
    //         views.setTextViewText(R.id.current_date_text, "Tue, May 22")
    //         views.setTextViewText(R.id.weather_temp_text, "25°C")
    //         views.setTextViewText(R.id.weather_description_text, "Cloudy")
    //         views.setTextViewText(R.id.last_update_text, "Last updated: Now")
            
    //         // Update the widget
    //         appWidgetManager.updateAppWidget(appWidgetId, views)
    //         Log.d(TAG, "Widget \${appWidgetId} updated successfully")
            
    //     } catch (e: Exception) {
    //         Log.e(TAG, "Error updating widget \${appWidgetId}: \${e.message}")
    //     }
    // }
}`;

const widgetLayout = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_container"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:orientation="horizontal"
    android:padding="4dp"
    android:background="@android:color/transparent"
    android:gravity="start">

    <!-- Left Side: Weather Information -->
    <LinearLayout
        android:layout_width="0dp"
        android:layout_height="wrap_content"
        android:layout_weight="1"
        android:orientation="vertical">

        <TextView
            android:id="@+id/current_date_text"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="Date: --"
            android:textSize="18sp"
            android:textColor="#FFFFFF"
            android:fontFamily="sans-serif-medium"
            android:layout_marginBottom="4dp" />

        <LinearLayout
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:orientation="horizontal"
            android:layout_marginBottom="4dp">

            <TextView
                android:id="@+id/weather_temp_text"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="Temperature: --°"
                android:textSize="16sp"
                android:textColor="#FFFFFF"
                android:fontFamily="sans-serif-bold"
                android:layout_marginEnd="12dp" />

            <TextView
                android:id="@+id/weather_description_text"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="Condition: --"
                android:textSize="14sp"
                android:textColor="#FFFFFF"
                android:fontFamily="sans-serif-medium" />

        </LinearLayout>

        <TextView
            android:id="@+id/last_update_text"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="Last Updated: Never"
            android:textSize="12sp"
            android:fontFamily="sans-serif-medium"
            android:textColor="#FFFFFF" />

    </LinearLayout>

    <!-- Right Side: Error Indicator -->
    <LinearLayout
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:orientation="vertical"
        android:gravity="end|center_vertical"
        android:layout_marginStart="6dp">

        <TextView
            android:id="@+id/error_indicator"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="⚠️"
            android:textSize="14sp"
            android:textColor="#FF6B6B"
            android:visibility="gone"
            android:fontFamily="sans-serif-medium" />

    </LinearLayout>

</LinearLayout>`;

const widgetInfo = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="110dp"
    android:minHeight="40dp"
    android:updatePeriodMillis="2100000"
    android:initialLayout="@layout/widget_layout"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen" />`;

// ---------------------- Write Files ----------------------
try {
  const androidDir = path.join(__dirname, "../android/app/src/main");

  // Ensure directories exist
  const dirs = [
    path.join(androidDir, "res/layout"),
    path.join(androidDir, "res/xml"),
    path.join(androidDir, "java/com/betrweather/app/worker"),
    path.join(androidDir, "java/com/betrweather/app/widget"),
  ];

  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ Created directory: ${dir}`);
    }
  });
  // Write all files
  fs.writeFileSync(
    path.join(
      androidDir,
      "java/com/betrweather/app/worker/WeatherUpdateWorker.kt"
    ),
    weatherUpdateWorker
  );

  fs.writeFileSync(
    path.join(
      androidDir,
      "java/com/betrweather/app/widget/WeatherWidgetProvider.kt"
    ),
    weatherWidgetProvider
  );

  fs.writeFileSync(
    path.join(androidDir, "res/layout/widget_layout.xml"),
    widgetLayout
  );

  fs.writeFileSync(
    path.join(androidDir, "res/xml/weather_widget_info.xml"),
    widgetInfo
  );

  console.log("✅ All files written successfully");

  // Modify build files
  modifyBuildGradle();
  modifyAndroidManifest();
  modifyMainApplication();
} catch (error) {
  console.error("❌ Error:", error);
  process.exit(1);
}

console.log("🎉 Widget code generated!");
console.log(
  "📱 The widget will update every 15 minutes with the last update time"
);
