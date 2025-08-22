package com.omnichat

import com.facebook.react.bridge.*
import android.media.audiofx.LoudnessEnhancer
import android.media.MediaRecorder
import android.speech.tts.TextToSpeech
import java.util.Locale

class LoudnessEnhancerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private var loudnessEnhancer: LoudnessEnhancer? = null
    private var tts: TextToSpeech? = null
    
    init {
        tts = TextToSpeech(reactContext) { status ->
            if (status == TextToSpeech.SUCCESS) {
                tts?.language = Locale.US
            }
        }
    }

    override fun getName() = "LoudnessEnhancerModule"

    @ReactMethod
    fun initialize(audioSessionId: Int, promise: Promise) {
        try {
            loudnessEnhancer = LoudnessEnhancer(audioSessionId)
            loudnessEnhancer?.enabled = true
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun setGain(gainDB: Int, promise: Promise) {
        try {
            loudnessEnhancer?.setTargetGain(gainDB * 100) // Convert dB to millibels
            // Speak the new gain level
            // tts?.speak("Loudness set to $gainDB decibels", TextToSpeech.QUEUE_FLUSH, null, null)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun release() {
        loudnessEnhancer?.release()
        loudnessEnhancer = null
    }

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        tts?.shutdown()
        release()
    }
}