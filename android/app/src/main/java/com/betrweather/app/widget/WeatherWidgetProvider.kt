package com.betrweather.app.widget

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
import androidx.work.Constraints
import androidx.work.NetworkType
import androidx.work.BackoffPolicy
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
        Log.d(TAG, "onUpdate called for ${appWidgetIds.size} widgets")
                
        // Start WorkManager if not already running
        startWeatherUpdateWork(context)
        
        // Update each widget with click functionality
        appWidgetIds.forEach { appWidgetId ->
            updateWidgetWithClickIntent(context, appWidgetManager, appWidgetId)
        }
        
        // Trigger immediate weather update for fresh data
        triggerImmediateWeatherUpdate(context)
    }

    private fun updateWidgetWithClickIntent(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int
    ) {
        try {
            val views = RemoteViews(context.packageName, com.betrweather.app.R.layout.widget_layout)
            
            // Create click intent to open the app
            val intent = Intent(context, com.betrweather.app.MainActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            
            val pendingIntent = PendingIntent.getActivity(
                context,
                appWidgetId,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            
            
            views.setOnClickPendingIntent(com.betrweather.app.R.id.widget_container, pendingIntent)

            appWidgetManager.updateAppWidget(appWidgetId, views)
            
            Log.d(TAG, "Widget $appWidgetId updated with click intent")
            
        } catch (e: Exception) {
            Log.e(TAG, "Error updating widget $appWidgetId: ${e.message}")
        }
    }

    private fun startWeatherUpdateWork(context: Context) {
        try {
            val workManager = WorkManager.getInstance(context)

            val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .setRequiresBatteryNotLow(false)
            .setRequiresCharging(false)
            .setRequiresDeviceIdle(false)
            .build()
            
            // Use unique work name to prevent duplicates
            val weatherWorkRequest = PeriodicWorkRequestBuilder<WeatherUpdateWorker>(
                15, TimeUnit.MINUTES
            )
                .setConstraints(constraints)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 5, TimeUnit.MINUTES)
                .addTag("weather_update").build()
            
            workManager.enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                weatherWorkRequest
            )
            
            Log.d(TAG, "Weather update work scheduled")
        } catch (e: Exception) {
            Log.e(TAG, "Error starting weather update work: ${e.message}")
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
            Log.e(TAG, "Error enqueueing immediate weather update: ${e.message}")
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
            Log.e(TAG, "Error cancelling weather update work: ${e.message}")
        }
    }
}