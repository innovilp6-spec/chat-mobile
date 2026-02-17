# PERMISSIONS & AUDIO: TCS Sankara (OmniChat)

This document provides a detailed breakdown of the Android permissions and microphone handling logic implemented in the TCS Sankara application.

## 1. AndroidManifest Declared Permissions
The application declares the following permissions in `AndroidManifest.xml` to support its core audio and networking features:
- **`android.permission.INTERNET`**: Required to communicate with the Google Gemini API for translations and smart responses.
- **`android.permission.RECORD_AUDIO`**: Essential for capturing user speech for both real-time transcription and audio analysis.
- **`android.permission.MODIFY_AUDIO_SETTINGS`**: Required for the native `NoiseSuppressor` and `LoudnessEnhancer` modules to modify the system audio session properties.
- **`android.permission.SYSTEM_ALERT_WINDOW`**: Used for development-related overlays or advanced UI features.
- **`android.permission.QUERY_ALL_PACKAGES`**: Facilitates interaction with system-level services, particularly for Text-to-Speech (TTS) integration.

## 2. Runtime Permission Requests
The application strictly follows the Android runtime permission model:
- **Triggers**: Permissions are requested only when the user enters a conversation screen (`A2AScreen` or `F2FScreen`) and attempts to start listening.
- **Request Flow**:
  1. The `checkMicrophonePermission` utility uses `PermissionsAndroid.request`.
  2. A localized rationale dialog explains why microphone access is needed.
  3. If the user denies the request, the audio features (Voice STT, AI analysis) are disabled, and a toast notification is shown.
- **Re-checks**: The app re-verifies permission status during every `startListening` lifecycle call to account for user changes in system settings.

## 3. Microphone Access Handling
Microphone access is orchestrated through two primary components:
- **`Voice` (STT)**: When `Voice.start()` is called, the system engages the microphone for real-time streaming to the speech recognition service.
- **`Recorder`**: For specific विश्लेषण (analysis) tasks, the microphone is engaged via the `@react-native-community/audio-toolkit` to save raw audio into a temporary local file.
- **Resource Cleanup**: To avoid "Microphone in use" errors, the app explicitly calls `Voice.stop()`, `Voice.destroy()`, and `Recorder.stop()` in `useFocusEffect` cleanup and during screen transitions.

## 4. Audio Focus Handling
The application relies on the underlying Android system to manage audio focus, but specifically handles it during the STT -> TTS transition:
- **Ducking/Stopping**: Before starting Text-to-Speech (`Tts.speak`), the application proactively stops active voice recognition (`Voice.stop()`) to ensure the synthesized audio has clear output priority.
- **Global Sessions**: The `LoudnessEnhancer` is initialized with `audioSessionId: 0`, which targets the global system mix, ensuring that amplified audio affects all outputs relevant to the conversation.

## 5. OS Version Compatibility
- **Android 11+ (API 30)**: The application includes `<queries>` for the `TTS_SERVICE` in the manifest to ensure that `android.intent.action.TTS_SERVICE` is visible to the app, preventing TTS initialization failures.
- **Android 11+ (Record Audio)**: The app handles the "Always ask" and "While using the app" permission states natively through the standard React Native permission wrappers.
- **Hardware Features**: The application declares a requirement for `android.hardware.usb.host`, indicating intended use with external audio peripherals.

## 6. Security Implications
- **Privacy**: The application captures audio only when the mic icon is active or the user has initiated an analysis. There are no "always-listening" features.
- **Data Handling**: Captured audio signals processed for emotion analysis are stored in the app's cache directory (`RNFS.CachesDirectoryPath`) and are deleted immediately after transcription or LLM processing.
- **Scope**: By using `MODIFY_AUDIO_SETTINGS`, the app has the capability to affect system-wide audio levels, which is utilized specifically for the defined 30dB boost feature.
