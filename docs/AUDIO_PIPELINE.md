# AUDIO PIPELINE: TCS Sankara (OmniChat)

This document describes the end-to-end audio processing pipeline implemented in the TCS Sankara application, covering capture, enhancement, and synthesis.

## 1. Microphone Input Handling
The application employs two distinct methods for microphone input depending on the operational mode:
- **Speech Recognition (STT)**: Uses `@react-native-voice/voice` to stream microphone data to cloud services for real-time transcription. This is primarily used for the chat interface.
- **Direct Recording**: Uses the `Recorder` module from `@react-native-community/audio-toolkit` to capture raw audio into `.wav` or `.mp3` files for offline processing or emotion analysis (as seen in the `anayzeAudio` workflows).
- **Configuration**: Recordings are typically configured for **Single Channel (Mono)**, **44.1kHz Sample Rate**, and **PCM/WAV format** to ensure compatibility with both internal analysis and external LLM requirements.

## 2. Noise Suppression Implementation
Noise suppression is handled at the OS level via a native Android bridge:
- **Module**: `NoiseSuppressorModule.kt` (Kotlin).
- **Technique**: Wraps the native Android `android.media.audiofx.NoiseSuppressor`.
- **Initialization**: Triggered via `NoiseSuppressor.initialize(audioSessionId)`. In the current implementation, an `audioSessionId` of `0` is used to target the default capture session.
- **Availability**: The module performs an explicit hardware check using `NoiseSuppressor.isAvailable()` before activation, as this is a hardware-dependent feature.

## 3. Voice Amplification Processing
To assist users with hearing impairments, the app implements a professional-grade loudness boost:
- **Module**: `LoudnessEnhancerModule.kt` (Kotlin).
- **Technique**: Wraps `android.media.audiofx.LoudnessEnhancer`.
- **Dynamic Gain**: The module accepts a gain value in decibels (dB) from the UI (0 to 30dB) and converts it to **millibels** (dB * 100) before applying it to the Android audio session.
- **Lifecycle**: The enhancer is initialized on-demand when a message is received or when the user manually toggles the amplification slider.

## 4. Audio Output Routing
Processed text is converted back to audio through the following path:
1. **TTS Engine**: `react-native-tts` synthesizes speech using the `en-US` locale (default).
2. **System Routing**: The synthesized audio is routed through the Android system's media stream.
3. **Amplification Layer**: Because the `LoudnessEnhancer` is attached to the audio session (often the global mix in this implementation), the TTS output is amplified according to the user's gain settings before reaching the physical speakers or headphones.

## 5. Permission Handling
Strict permission workflows are implemented to comply with Android 11+ security standards:
- **Requirement**: `android.permission.RECORD_AUDIO`.
- **Flow**: The `checkMicrophonePermission` utility in `A2AScreen.js` / `F2FScreen.js` uses `PermissionsAndroid.request` to prompt the user.
- **Enforcement**: Audio modules are not initialized, and recording buttons are disabled unless `GRANTED` status is returned.

## 6. Threading Considerations
- **Bridge Thread**: UI interactions and gain value changes originate on the React Native JS thread.
- **Main/UI Thread**: The Kotlin modules execute on the Android UI thread for initialization and UI-facing updates (like TTS status).
- **Background Drivers**: The actual real-time audio transformation (Suppression/Loudness) is handled by the Android Audio HAL (Hardware Abstraction Layer) in high-priority media threads, ensuring minimal latency (sub-20ms).

## 7. Failure Scenarios
The pipeline includes several fallback mechanisms:
- **Hardware Incompatibility**: If `NoiseSuppressor.create()` fails due to missing hardware support, the app catches the exception and notifies the user via toast while allowing the conversation to continue without suppression.
- **Session Loss**: If the audio session is killed by the OS (e.g., incoming call), the `release()` and `initialize()` lifecycle methods are used to reset the state during component re-focus.
- **API Errors**: Speech-to-text failures trigger an automatic cleanup of `Voice.stop()` to release the microphone resource.

## 8. Performance Implications
- **Memory Management**: The app uses `RNFS.unlink` to delete temporary audio chunks immediately after they are processed by the LLM, preventing disk space accumulation.
- **CPU Overhead**: While `NoiseSuppressor` is efficient (hardware-accelerated), running the `LoudnessEnhancer` continuously with high gain levels can marginally increase battery consumption.
- **Audio Lag**: The use of compressed MP3 formats for LLM payloads (via `react-native-compressor`) reduces the upload time, which is the primary bottleneck in the overall pipeline latency.
