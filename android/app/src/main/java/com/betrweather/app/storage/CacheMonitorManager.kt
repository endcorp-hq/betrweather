package com.betrweather.app.storage

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
