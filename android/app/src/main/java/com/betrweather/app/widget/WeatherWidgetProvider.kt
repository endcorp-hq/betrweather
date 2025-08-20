package com.betrweather.app.widget

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
        // Remove the cacheMonitor variable - we'll use the manager instead
    }

    
    
    override fun onEnabled(context: Context) {
        super.onEnabled(context)
        Log.d(TAG, "First widget added - starting background services")

        // Start worker
        val weatherWorkRequest = PeriodicWorkRequestBuilder<com.betrweather.app.worker.WeatherUpdateWorker>(
            15, TimeUnit.MINUTES
        ).build()

        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            "weather_updates",
            ExistingPeriodicWorkPolicy.REPLACE,
            weatherWorkRequest
        )

        // Start monitoring cache using the manager
        CacheMonitorManager.start()
        Log.d(TAG, "Weather update worker scheduled + cache monitor started")
    }

    override fun onDisabled(context: Context) {
        super.onDisabled(context)
        Log.d(TAG, "Last widget removed - stopping background services")

        // Cancel worker
        WorkManager.getInstance(context).cancelUniqueWork("weather_updates")

        // Note: We DON'T stop the CacheMonitor here anymore
        // It will keep running even when widgets are removed
        Log.d(TAG, "Weather update worker cancelled (CacheMonitor keeps running)")
    }
    
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        Log.d(TAG, "Widget update requested for ${appWidgetIds.size} widgets")
        
        for (appWidgetId in appWidgetIds) {
            updateWeatherWidget(context, appWidgetManager, appWidgetId)
        }
    }
    
    private fun updateWeatherWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        try {
            val weatherCache = WeatherCache(context)
            val weatherData = weatherCache.getWeather()
            val updateCounter = weatherCache.getUpdateCounter()
            
            if (weatherData != null) {
                Log.d(TAG, "This is the weather found: ${weatherData.temperature}, ${weatherData.condition}, Update #$updateCounter")
                
                val views = RemoteViews(context.packageName, R.layout.weather_widget)
                
                // Update widget with real weather data
                views.setTextViewText(R.id.temperature_text, weatherData.temperature)
                views.setTextViewText(R.id.condition_text, weatherData.condition)
                views.setTextViewText(R.id.refresh_counter_text, "Refresh counter: $updateCounter")
                
                // Set click intent to open the app
                val intent = Intent(context, MainActivity::class.java)
                intent.action = ACTION_WIDGET_CLICK
                val pendingIntent = PendingIntent.getActivity(
                    context, 0, intent, 
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.widget_container, pendingIntent)
                
                appWidgetManager.updateAppWidget(appWidgetId, views)
                Log.d(TAG, "Widget updated successfully with weather data, Update #$updateCounter")
                
            } else {
                Log.d(TAG, "No weather data available for widget")
                
                val views = RemoteViews(context.packageName, R.layout.weather_widget)
                views.setTextViewText(R.id.temperature_text, "No Data")
                views.setTextViewText(R.id.condition_text, "Tap to refresh")
                views.setTextViewText(R.id.refresh_counter_text, "Refresh counter: $updateCounter")
                
                // Set click intent to open the app
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
}
