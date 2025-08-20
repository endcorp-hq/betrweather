package com.betrweather.app.worker

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
                Log.d(TAG, "Got location: ${location.first}, ${location.second}")
                
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
                Log.e(TAG, "API call failed: ${response.code}")
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
                    "CELSIUS" -> "${tempDegrees}°C"
                    "FAHRENHEIT" -> "${tempDegrees}°F"
                    else -> "${tempDegrees}°"
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
