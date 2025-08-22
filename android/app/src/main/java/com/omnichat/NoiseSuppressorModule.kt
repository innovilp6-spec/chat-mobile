package com.omnichat

import com.facebook.react.bridge.*
import android.media.audiofx.NoiseSuppressor
import android.media.MediaRecorder

class NoiseSuppressorModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private var noiseSuppressor: NoiseSuppressor? = null
    
    override fun getName() = "NoiseSuppressorModule"

    @ReactMethod
    fun initialize(audioSessionId: Int, promise: Promise) {
        try {
            if (NoiseSuppressor.isAvailable()) {
                noiseSuppressor = NoiseSuppressor.create(audioSessionId)
                noiseSuppressor?.enabled = true
                promise.resolve(true)
            } else {
                promise.reject("ERROR", "Noise suppressor not available on this device")
            }
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun release() {
        noiseSuppressor?.release()
        noiseSuppressor = null
    }

    @ReactMethod
    fun setEnabled(enabled: Boolean, promise: Promise) {
        try {
            noiseSuppressor?.enabled = enabled
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
}