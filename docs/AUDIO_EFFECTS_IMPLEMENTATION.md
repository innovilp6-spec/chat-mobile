# AUDIO EFFECTS IMPLEMENTATION: TCS Sankara (OmniChat)

This document provides a technical deep-dive into the implementation of native Android audio effects within the TCS Sankara application. The app leverages the Android `audiofx` framework to enhance speech clarity and provide assistive volume boosting.

## 1. Overview
The application implements two critical audio effects to facilitate clear communication:
- **Noise Suppression**: Aimed at reducing ambient background noise (HVAC, street noise, etc.) during microphone capture to improve the accuracy of Speech-to-Text (STT) and LLM analysis.
- **Loudness Enhancer**: Designed as an assistive feature to amplify audio output beyond standard system limits (up to 30dB), helping users with hearing impairments.
- **Requirement Context**: In in-person conversation scenarios, environmental noise and low vocal volume are primary barriers. These effects are implemented at the OS level to ensure low-latency, real-time transformation.

## 2. Audio Session Architecture
### AudioSessionId Management
In the Android media framework, audio effects must be attached to a specific `AudioSessionId`.
- **Implementation**: The application currently passes an `audioSessionId` of `0` from the JavaScript layer to the native Kotlin modules.
- **Global Scope**: An ID of `0` typically refers to the global output mix or the primary capture session, depending on the effect type and device implementation.
- **Bridge Data Flow**:
  1. JS calls `NoiseSuppressor.initialize(0)`.
  2. Kotlin `NoiseSuppressorModule` receives the integer.
  3. Native effect is instantiated using this ID.

### Relationship with Capture/Playback
While the application uses `@react-native-voice/voice` and `@react-native-community/audio-toolkit` for capture, the effects are managed independently via the Bridge. By attaching to the session ID, the effects intercept the signal as it passes through the Android Audio HAL.

## 3. NoiseSuppressor Implementation
### Availability & Creation
- **Hardware Check**: Before creation, the module calls `NoiseSuppressor.isAvailable()`. This is crucial as Noise Suppression is often hardware-accelerated and not available on all chipsets.
- **Instantiation**: 
  ```kotlin
  noiseSuppressor = NoiseSuppressor.create(audioSessionId)
  ```
- **Activation**: Once created, it is explicitly enabled by setting `noiseSuppressor?.enabled = true`.

### Lifecycle Handling
- **Enable/Disable**: Controlled via the `setEnabled(enabled: Boolean)` bridge method.
- **Release**: The `release()` method explicitly calls `noiseSuppressor?.release()` and nullifies the reference to prevent memory leaks and free up hardware audio resources.
- **Activity Lifecycle**: The module hooks into `onCatalystInstanceDestroy()` to ensure effects are cleaned up when the React context is invalidated.

## 4. LoudnessEnhancer Implementation
### Instantiation & Gain Control
- **Object Creation**: Instantiated via `LoudnessEnhancer(audioSessionId)`.
- **Target Gain**: The module accepts a gain value in decibels (dB). 
- **Millibel Conversion**: Android's `setTargetGain` expects values in **millibels** (mB). The module performs the conversion:
  ```kotlin
  loudnessEnhancer?.setTargetGain(gainDB * 100)
  ```
- **Range**: The UI limits this to **0 - 30dB** (0 - 3000 mB) to balance amplification with audio quality.

### Lifecycle Management
- **Persistence**: The enhancer remains active as long as the conversation screen is focused.
- **Resource Risks**: High gain (near 30dB) carries a risk of **clipping and distortion**, especially if the source audio is already high-volume. The app relies on the user to manually tune this using the slider.

## 5. Threading & Performance Considerations
- **HAL Execution**: The actual signal processing occurs in the Android **Audio Hardware Abstraction Layer (HAL)** threads, which are high-priority and separate from the application's UI or JS threads.
- **UI Impact**: Commands from JS (like updating gain) are asynchronous and have negligible impact on the UI thread (60fps remains stable).
- **Latency**: Using native `audiofx` minimizes latency compared to software-based processing in JS, providing typical throughput latency of <20ms.

## 6. Interaction Between Effects
- **Signal Flow**: When both are active, the signal typically follows the native Android path: 
  `Mic Input` -> `NoiseSuppressor` -> `System Mix` -> `LoudnessEnhancer` -> `Speaker/Headphones`.
- **Order of Activation**: The app initializes these effects upon screen focus. Enabling Noise Suppression first ensures the Loudness Enhancer amplifies a "cleaner" signal rather than boosting ambient noise.

## 7. Permission Requirements
- **Manifest**: Requires `android.permission.MODIFY_AUDIO_SETTINGS`.
- **Runtime**: Microphone access (`RECORD_AUDIO`) must be granted before these modules are meaningful, as suppressed noise depends on an active capture stream.

## 8. Device & OS Compatibility
- **Constraints**: Requires **Android 4.4 (API 19)** or higher for Loudness Enhancer and **Android 4.1 (API 16)** for Noise Suppressor.
- **Incompatibility Fallback**: If `isAvailable()` returns false or if `create()` throws an exception, the Promise is rejected with an "ERROR" code, which the JS layer catches to show a "Feature not available" toast.

## 9. Error Handling & Recovery
- **Try/Catch Blocks**: All native calls are wrapped in Kotlin `try-catch` blocks.
- **Promise Rejection**: Exceptions are passed back to JS as rejected promises with descriptive error messages (e.g., "Noise suppressor not available on this device").
- **State Recovery**: If the audio session is lost, the user can toggle the effect off and on to re-initialize the module.

## 10. Cleanup & Resource Management
- **Explicit Release**: Every module implementation includes a `release()` method.
- **Reference Management**: All native objects are nullable and set to `null` post-release to assist the JVM garbage collector.
- **Activity Hooks**: The `onCatalystInstanceDestroy` override in `LoudnessEnhancerModule.kt` ensures cleanup even if the user exits the app abruptly.

## 11. Technical Risks & Limitations
- **Hardware Variance**: The quality of "Noise Suppression" varies significantly between a flagship device (with dedicated DSP) and a budget device (software-emulated).
- **Audio Focus**: System-level events (like a phone call) may hijack the audio session, potentially requiring the effects to be re-initialized once the app regains focus.
- **Clipping**: No automatic gain control (AGC) is currently implemented to prevent clipping at maximal gain levels.
