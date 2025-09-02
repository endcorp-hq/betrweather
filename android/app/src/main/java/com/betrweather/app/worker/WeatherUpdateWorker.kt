package com.betrweather.app.worker

import android.content.Context
import android.content.Intent
import android.location.Location
import android.location.LocationManager
import android.location.LocationListener
import android.os.Bundle
import android.os.PowerManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
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
import kotlin.math.roundToInt
import android.view.View
import android.content.ComponentName
import android.appwidget.AppWidgetManager
import android.widget.RemoteViews

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

    // Error tracking variables
    private var lastParsingError: String? = null
    private var lastNetworkError: String? = null
    private var lastTimeoutError: String? = null
    private var lastHttpError: String? = null

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
                    Log.d(TAG, "[Worker-$workerId] Location obtained: ${location.first}, ${location.second}")
                    
                    // Update location cache with successful location
                    updateLocationCache(location.first, location.second)
                    
                    // Fetch weather with retry
                    val weatherData = fetchWeatherWithRetry(location.first, location.second)
                    if (weatherData != null && !weatherData.hasError) {
                        // Success: Update with new data
                        updateWidgets(weatherData)
                        setLastUpdateTime()
                        
                        // Clear all error tracking variables on success
                        lastNetworkError = null
                        lastHttpError = null
                        lastParsingError = null
                        lastTimeoutError = null
                        
                        Log.d(TAG, "[Worker-$workerId] Success - all errors cleared")
                    } else {
                        // Error: Keep existing data, show error
                        val errorMsg = when {
                            lastParsingError != null -> "Could not parse data"
                            lastNetworkError != null -> {
                                val networkError = lastNetworkError
                                when {
                                    networkError?.contains("Device asleep") == true -> "Device asleep"
                                    networkError?.contains("No network") == true -> "No internet"
                                    networkError?.contains("No network connection") == true -> "No network connection"
                                    networkError?.contains("No internet access") == true -> "No internet access"
                                    networkError?.contains("Network not validated") == true -> "Network not validated"
                                    networkError?.contains("DNS failed") == true -> "DNS resolution failed"
                                    networkError?.contains("Connection failed") == true -> "Connection failed"
                                    networkError?.contains("Request timed out") == true -> "Request timed out"
                                    else -> networkError ?: "Network error"
                                }
                            }
                            lastTimeoutError != null -> "Request hung"
                            lastHttpError != null -> "HTTP error"
                            else -> "Update failed"
                        }
                        
                        updateWidgets(null, errorMsg)
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
                    updateWidgets(errorWeatherData)
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
            updateWidgets(errorWeatherData)
            
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
                    // Round to 1 decimal place
                    val roundedLocation = Pair(
                        (fusedLocation.first * 10.0).roundToInt() / 10.0,
                        (fusedLocation.second * 10.0).roundToInt() / 10.0
                    )
                    Log.d(TAG, "[Worker-$workerId] Rounded location: ${roundedLocation.first}, ${roundedLocation.second}")
                    return@withContext roundedLocation
                }
                
                // Fallback to LocationManager if FusedLocationProviderClient fails
                Log.d(TAG, "[Worker-$workerId] FusedLocationProviderClient failed, trying LocationManager fallback")
                val locationManagerLocation = getLocationManagerLocation()
                if (locationManagerLocation != null) {
                    Log.d(TAG, "[Worker-$workerId] Successfully got location from LocationManager fallback")
                    // Round to 1 decimal place
                    val roundedLocation = Pair(
                        (locationManagerLocation.first * 10.0).roundToInt() / 10.0,
                        (locationManagerLocation.second * 10.0).roundToInt() / 10.0
                    )
                    Log.d(TAG, "[Worker-$workerId] Rounded location: ${roundedLocation.first}, ${roundedLocation.second}")
                    return@withContext roundedLocation
                }
                
                // Final fallback: try to get location from cache
                Log.d(TAG, "[Worker-$workerId] All location providers failed, trying cached location")
                val cachedLocation = getCachedLocation()
                if (cachedLocation != null) {
                    Log.d(TAG, "[Worker-$workerId] Using cached location: ${cachedLocation.first}, ${cachedLocation.second}")
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
                        Log.d(TAG, "[Worker-$workerId] FusedLocationProviderClient success: ${location.latitude}, ${location.longitude}")
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
                        Log.d(TAG, "[Worker-$workerId] LocationManager success: ${lastKnownLocation.latitude}, ${lastKnownLocation.longitude}")
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
                        Log.d(TAG, "[Worker-$workerId] LocationManager onLocationChanged: ${location.latitude}, ${location.longitude}")
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
                // Round to 1 decimal place for consistency
                val roundedLat = (lat.toDouble() * 10.0).roundToInt() / 10.0
                val roundedLon = (lon.toDouble() * 10.0).roundToInt() / 10.0
                Log.d(TAG, "[Worker-$workerId] Using cached location: $roundedLat, $roundedLon (age: ${cacheAge / (60 * 60 * 1000)} hours)")
                Pair(roundedLat, roundedLon)
            } else {
                if (lat == 0f || lon == 0f) {
                    Log.d(TAG, "[Worker-$workerId] No cached location available")
                } else {
                    Log.d(TAG, "[Worker-$workerId] Cached location expired (age: ${cacheAge / (60 * 60 * 1000)} hours)")
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
            // Round to 1 decimal place before caching
            val roundedLat = (latitude * 10.0).roundToInt() / 10.0
            val roundedLon = (longitude * 10.0).roundToInt() / 10.0
            
            val sharedPrefs = context.getSharedPreferences("LocationCache", Context.MODE_PRIVATE)
            sharedPrefs.edit()
                .putFloat("cached_latitude", roundedLat.toFloat())
                .putFloat("cached_longitude", roundedLon.toFloat())
                .putLong("cached_timestamp", System.currentTimeMillis())
                .apply()
            
            Log.d(TAG, "[Worker-$workerId] Location cache updated: $roundedLat, $roundedLon")
        } catch (e: Exception) {
            Log.e(TAG, "[Worker-$workerId] Error updating location cache", e)
        }
    }

    private suspend fun fetchWeatherFromAPI(latitude: Double, longitude: Double): WeatherData? {
        return withContext(Dispatchers.IO) {
            try {
                // Clear previous errors
                lastNetworkError = null
                lastHttpError = null
                lastParsingError = null
                lastTimeoutError = null
                
                Log.d(TAG, "[Worker-$workerId] Creating OkHttp client...")
                val client = OkHttpClient.Builder()
                    .connectTimeout(15, TimeUnit.SECONDS)
                    .readTimeout(15, TimeUnit.SECONDS)
                    .addInterceptor { chain ->
                        val request = chain.request().newBuilder()
                            .addHeader("X-Request-Priority", "high")
                            .addHeader("Cache-Control", "no-cache")
                            .build()
                        chain.proceed(request)
                    }
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
                    Log.d(TAG, "[Worker-$workerId] Response received: ${response.code}")
                    
                    if (response.isSuccessful) {
                        val responseBody = response.body?.string()
                        Log.d(TAG, "[Worker-$workerId] API response body length: ${responseBody?.length ?: 0}")
                        
                        // Parse your actual API response
                        val weatherData = parseWeatherResponse(responseBody)
                        if (weatherData != null) {
                            Log.d(TAG, "[Worker-$workerId] Weather data parsed successfully: ${weatherData.temperature}, ${weatherData.condition}")
                        } else {
                            Log.w(TAG, "[Worker-$workerId] Failed to parse weather response")
                            lastParsingError = "Failed to parse API response"
                        }
                        weatherData
                    } else {
                        Log.e(TAG, "[Worker-$workerId] API call failed: ${response.code}")
                        lastHttpError = "HTTP ${response.code}"
                        null
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "[Worker-$workerId] Exception in fetchWeatherFromAPI", e)
                
                // Determine the type of error
                when (e) {
                    is java.net.SocketTimeoutException -> {
                        lastTimeoutError = "Request timed out"
                        Log.e(TAG, "[Worker-$workerId] Request timed out")
                    }
                    is java.net.UnknownHostException -> {
                        lastNetworkError = "No internet connection"
                        Log.e(TAG, "[Worker-$workerId] No internet connection")
                    }
                    is java.net.ConnectException -> {
                        lastNetworkError = "Connection failed"
                        Log.e(TAG, "[Worker-$workerId] Connection failed")
                    }
                    else -> {
                        lastNetworkError = "Network error: ${e.message}"
                        Log.e(TAG, "[Worker-$workerId] Generic network error: ${e.message}")
                    }
                }
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
            Log.d(TAG, "[Worker-$workerId] Parsed weather data: ${tempDegrees}°C, $description, Daytime: $isDaytime")
            
            // Format temperature with unit
            val formattedTemperature = when (tempUnit) {
                "CELSIUS" -> "${tempDegrees}°C"
                "FAHRENHEIT" -> "${tempDegrees}°F"
                else -> "${tempDegrees}°"
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

    // Update the updateWidgets method in WeatherUpdateWorker:

    private fun updateWidgets(weatherData: WeatherData?, errorMessage: String? = null) {
        val appWidgetManager = AppWidgetManager.getInstance(context)
        val appWidgetIds = appWidgetManager.getAppWidgetIds(
            ComponentName(context, com.betrweather.app.widget.WeatherWidgetProvider::class.java)
        )

        appWidgetIds.forEach { appWidgetId ->
            try {
                val views = RemoteViews(context.packageName, com.betrweather.app.R.layout.widget_layout)
                
                // Check if we have location permissions
                val hasForegroundPermission = context.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == 
                    PackageManager.PERMISSION_GRANTED
                val hasBackgroundPermission = context.checkSelfPermission(Manifest.permission.ACCESS_BACKGROUND_LOCATION) == 
                    PackageManager.PERMISSION_GRANTED
                
                if (!hasForegroundPermission || !hasBackgroundPermission) {
                    // No permissions - show simple message
                    views.setTextViewText(com.betrweather.app.R.id.current_date_text, "Click to enable")
                    views.setTextViewText(com.betrweather.app.R.id.weather_temp_text, "location")
                    views.setTextViewText(com.betrweather.app.R.id.weather_description_text, "permissions")
                    
                    Log.d(TAG, "[Worker-$workerId] Widget updated with permission request message")
                } else if (weatherData != null && !weatherData.hasError) {
                    // Success case: Update with new weather data AND clear any previous errors
                    views.setTextViewText(com.betrweather.app.R.id.current_date_text, getCurrentDate())
                    views.setTextViewText(com.betrweather.app.R.id.weather_temp_text, weatherData.temperature)
                    views.setTextViewText(com.betrweather.app.R.id.weather_description_text, weatherData.condition)
                    
                    Log.d(TAG, "[Worker-$workerId] Widget updated with weather data: ${weatherData.temperature}, ${weatherData.condition} - Errors cleared")
                } else {
                    // Error case: Keep existing data, show error on right side
                    // Don't update the weather fields - let them keep their current values
                    
                    Log.d(TAG, "[Worker-$workerId] Widget error displayed: $errorMessage")
                }
                
                // Update the widget
                appWidgetManager.updateAppWidget(appWidgetId, views)
                
            } catch (e: Exception) {
                Log.e(TAG, "[Worker-$workerId] Error updating widget $appWidgetId: ${e.message}")
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
        val hasError: Boolean = false
    )

    // Update the isNetworkAvailable method to return detailed error information:
    private fun getNetworkStatus(): Pair<Boolean, String> {
        try {
            val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
            val network = connectivityManager.activeNetwork
            
            if (network == null) {
                return Pair(false, "No network connection")
            }
            
            val capabilities = connectivityManager.getNetworkCapabilities(network)
            
            val hasInternet = capabilities?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) == true
            val isValidated = capabilities?.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED) == true
            
            return when {
                !hasInternet -> Pair(false, "No internet access")
                !isValidated -> Pair(false, "Network not validated")
                else -> Pair(true, "Network OK")
            }
        } catch (e: Exception) {
            return Pair(false, "Network check failed")
        }
    }

    // Check if device is in doze mode:
    private fun isDeviceInDozeMode(): Boolean {
        val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        return powerManager.isDeviceIdleMode
    }

    // Check if device is interactive:
    private fun isDeviceInteractive(): Boolean {
        val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        return powerManager.isInteractive
    }

    // Update the fetchWeatherWithRetry method to use detailed error messages:
    private suspend fun fetchWeatherWithRetry(latitude: Double, longitude: Double, maxRetries: Int = 3): WeatherData? {
        var attempt = 0
        
        while (attempt < maxRetries) {
            attempt++
            Log.d(TAG, "[Worker-$workerId] Attempt $attempt of $maxRetries")
            
            try {
                // Check network before making the call
                val (isNetworkOk, networkStatus) = getNetworkStatus()
                if (!isNetworkOk) {
                    Log.w(TAG, "[Worker-$workerId] Network issue: $networkStatus on attempt $attempt")
                    
                    // Check if device is in doze mode
                    if (isDeviceInDozeMode()) {
                        lastNetworkError = "Device asleep - try again later"
                    } else {
                        lastNetworkError = networkStatus // Use the detailed network status
                    }
                    
                    if (attempt < maxRetries) {
                        val delayMs = (5000L * (1 shl (attempt - 1))).coerceAtMost(30000L) // 5s, 10s, 20s, max 30s
                        Log.d(TAG, "[Worker-$workerId] Waiting ${delayMs}ms before retry...")
                        delay(delayMs)
                        continue
                    } else {
                        lastNetworkError = "$networkStatus after $maxRetries attempts"
                        return null
                    }
                }
                
                // Network is available, make the API call
                Log.d(TAG, "[Worker-$workerId] Network available, making API call...")
                val weatherData = fetchWeatherFromAPI(latitude, longitude)
                
                if (weatherData != null) {
                    Log.d(TAG, "[Worker-$workerId] Success on attempt $attempt")
                    return weatherData
                } else {
                    Log.w(TAG, "[Worker-$workerId] Failed to get weather data on attempt $attempt")
                    
                    if (attempt < maxRetries) {
                        val delayMs = (5000L * (1 shl (attempt - 1))).coerceAtMost(30000L)
                        Log.d(TAG, "[Worker-$workerId] Waiting ${delayMs}ms before retry...")
                        delay(delayMs)
                    }
                }
                
            } catch (e: Exception) {
                Log.e(TAG, "[Worker-$workerId] Exception on attempt $attempt", e)
                
                if (attempt < maxRetries) {
                    val delayMs = (5000L * (1 shl (attempt - 1))).coerceAtMost(30000L)
                    Log.d(TAG, "[Worker-$workerId] Waiting ${delayMs}ms before retry after exception...")
                    delay(delayMs)
                } else {
                    // Set appropriate error based on exception type
                    when (e) {
                        is java.net.SocketTimeoutException -> lastTimeoutError = "Request timed out after $maxRetries attempts"
                        is java.net.UnknownHostException -> lastNetworkError = "DNS failed after $maxRetries attempts"
                        is java.net.ConnectException -> lastNetworkError = "Connection failed after $maxRetries attempts"
                        else -> lastNetworkError = "Network error after $maxRetries attempts: ${e.message ?: "Unknown error"}"
                    }
                }
            }
        }
        
        Log.w(TAG, "[Worker-$workerId] All $maxRetries attempts failed")
        return null
    }

    // Add helper method to get current date:
    private fun getCurrentDate(): String {
        return SimpleDateFormat("EEE, MMM dd", Locale.ENGLISH).format(Date())
    }

    // Add helper method to get last updated time:
    private fun getLastUpdatedTime(): String {
        val now = System.currentTimeMillis()
        val lastUpdate = getLastUpdateTime()
        val diffMinutes = (now - lastUpdate) / (60 * 1000)
        
        return when {
            diffMinutes < 1 -> "Just now"
            diffMinutes < 60 -> "${diffMinutes}m ago"
            else -> "${diffMinutes / 60}h ago"
        }
    }

    // Add method to track last update time:
    private fun getLastUpdateTime(): Long {
        val prefs = context.getSharedPreferences("WeatherWidget", Context.MODE_PRIVATE)
        return prefs.getLong("last_update_time", System.currentTimeMillis())
    }

    private fun setLastUpdateTime() {
        val prefs = context.getSharedPreferences("WeatherWidget", Context.MODE_PRIVATE)
        prefs.edit().putLong("last_update_time", System.currentTimeMillis()).apply()
    }
}