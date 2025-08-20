package com.betrweather.app.bridge

import com.facebook.react.bridge.*
import com.betrweather.app.storage.WeatherCache
import android.util.Log

class WeatherConfigModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    override fun getName(): String {
        return "WeatherConfigModule"
    }
    
    @ReactMethod
    fun setUnit(unit: String, promise: Promise) {
        try {
            val weatherCache = WeatherCache(reactApplicationContext)
            // Store unit preference
            weatherCache.setUnit(unit)
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e("WeatherConfigModule", "Error setting unit", e)
            promise.reject("ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun setHexCell(hexCell: String, promise: Promise) {
        try {
            val weatherCache = WeatherCache(reactApplicationContext)
            // Store hex cell preference
            weatherCache.setHexCell(hexCell)
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e("WeatherConfigModule", "Error setting hex cell", e)
            promise.reject("ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun getWeatherData(promise: Promise) {
        try {
            val weatherCache = WeatherCache(reactApplicationContext)
            val weatherData = weatherCache.getWeather()
            val location = weatherCache.getLastLocation()
            val lastUpdate = weatherCache.getLastUpdateTime()
            
            if (weatherData != null) {
                val result = Arguments.createMap().apply {
                    putString("temperature", weatherData.temperature)
                    putString("condition", weatherData.condition)
                    putString("icon", weatherData.icon)
                    putDouble("timestamp", weatherData.timestamp.toDouble())
                    putDouble("latitude", location?.first ?: 0.0)
                    putDouble("longitude", location?.second ?: 0.0)
                    putDouble("lastUpdated", lastUpdate.toDouble())
                }
                promise.resolve(result)
            } else {
                promise.resolve(null)
            }
        } catch (e: Exception) {
            Log.e("WeatherConfigModule", "Error getting weather data", e)
            promise.reject("ERROR", e.message)
        }
    }
}
