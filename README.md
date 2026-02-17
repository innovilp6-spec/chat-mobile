# TCS Sankara (OmniChat)

## 1. Project Introduction
**TCS Sankara** (internally referenced as **OmniChat**) is a professional React Native Android application designed to facilitate seamless communication by breaking down language and hearing barriers. 

The application serves as an assistive tool for in-person conversations, particularly for users with hearing impairments or those communicating across different languages. By combining real-time speech processing with advanced generative AI, it enables two distinct interaction modes:
- **Audio-to-Audio (A2A)**: Real-time multilingual conversation hub.
- **Face-to-Face (F2F)**: Shared screen interaction for in-person dialogue.

### Core Capabilities
- **Noise Suppression**: Native OS-level filtering to clean input signals in real-time.
- **Voice Amplification**: A professional-grade loudness boost providing up to **30dB** of gain.
- **LLM Processing**: Integration with **Google Gemini 2.0 Flash** for translation, smart response generation, speech emotion recognition (SER), and conversation summarization.

---

## 2. High-Level Runtime Flow
1. **Audio Capture**: Microphone input is captured via `@react-native-voice/voice` (for real-time STT) or `@react-native-community/audio-toolkit` (for recording-based analysis).
2. **Native Processing Pipeline**: Audio data is processed at the HAL level through the `NoiseSuppressor` and `LoudnessEnhancer` Kotlin modules.
3. **LLM Text Processing**: Transcribed text or compressed audio data is sent to the Gemini API for contextual analysis or translation.
4. **Redux State Updates**: Results (translations, smart response arrays) are dispatched to the Redux store and persisted where necessary.
5. **UI Output**: The final processed/translated text is rendered in the chat UI and spoken back to the user via `react-native-tts`.

---

## 3. Architecture Overview
### Project Structure
- **/android**: Contains Kotlin-based native bridge modules for hardware-level audio effects.
- **/src**: Root of JavaScript source code, containing `/screens`, `/store` (Redux), and `/utils`.
- **/docs**: Detailed technical documentation for specific subsystems.

### App Initialization
- **Hydration**: The app uses `redux-persist` to restore language preferences and conversation metadata from `AsyncStorage`.
- **Credential Check**: On focus, conversation screens verify the existence of a Gemini API key in local storage.

### Navigation & State
- **Navigation**: Uses `@react-navigation/native-stack` for a lightweight, performant stack.
- **State Management**: Centralized store using **Redux Toolkit** with a whitelisted `translation` slice for persistent data storage across app restarts.
- **Async Handling**: Side effects and API interactions are orchestrated using **Redux Thunk**.

---

## 4. Audio Processing Pipeline
### Native Mechanisms
- **Noise Suppression**: Wraps the Android `android.media.audiofx.NoiseSuppressor`. It is initialized on the default capture session (`audioSessionId: 0`) and requires explicit hardware support check.
- **Voice Amplification**: Implements a dedicated `LoudnessEnhancer` module. It converts user-selected dB gain into millibels and applies it to the active audio session.
- **Routing**: Synthesized TTS output is routed through the same amplified audio session, ensuring the user hears the assistant clearly.

### Technical Implementation
- **Threading**: Native audio transformations occur in high-priority HAL media threads to ensure sub-20ms latency.
- **Failure Handling**: If native modules fail to initialize or aren't supported by the device OEM, the app gracefully degrades and allows the conversation to continue without enhancement.

---

## 5. LLM Integration
### Request & Response
- **Construction**: Payloads are built using the `GoogleGenerativeAI` SDK. History is serialized into a plain-text chat format for contextual smart responses.
- **Processing**: Responses are stripped of markdown decorators using regex and parsed into JSON arrays for UI rendering.
- **Audio Analysis**: Multimodal analysis uses compressed audio payloads (Sample Rate: 22050Hz, Bitrate: 64kbps) to minimize bandwidth.

### Reliability & Security
- **Error Handling**: Classified handling for 401 (Invalid Key), 429 (Quota Exceeded), and general network failures.
- **Rate Limiting**: Implementation of a 5000ms cool-down period between analysis requests to comply with free-tier API quotas.
- **Security**: API keys are stored locally in `AsyncStorage`. No backend servers are involved; all AI traffic is client-to-Google over HTTPS.

---

## 6. State Management
### Store Structure
- **Translation Slice**: Responsibilty for `userALanguage`, `userBLanguage`, and a `translations` lookup table (ID-to-string mapping).
- **Persistence**: Whitelisted `translation` slice ensures user preferences survive app reboots.
- **Action Flow**: `translateText` Thunk -> Gemini API -> `SET_TRANSLATION` Dispatch -> Redux Update -> `useSelector` Re-render.

---

## 7. Permissions & Android Configuration
### Declared Permissions
- `android.permission.RECORD_AUDIO`: Voice capture.
- `android.permission.MODIFY_AUDIO_SETTINGS`: Required for native audio effects control.
- `android.permission.INTERNET`: Gemini API communication.
- `android.permission.QUERY_ALL_PACKAGES`: TTS service discovery.

### Platform Considerations
- **Android 11+**: Includes required `<queries>` blocks for TTS service visibility.
- **Runtime Flow**: Permissions are requested explicitly through `PermissionsAndroid` when entering interaction screens.

---

## 8. Build & Setup
### Requirements
- **Node**: >= 18.0
- **Java**: 17 (recommended)
- **Android SDK**: Compile SDK 34, Build Tools 34.0.0, Min SDK 23.

### Dependency Installation
```bash
npm install
```

### Development Build
```bash
npx react-native start
npx react-native run-android
```

### Release Generation
1. Configure `your_key_name.keystore` in the `android/app` directory.
2. Run build command:
```bash
cd android
./gradlew assembleRelease
```
3. **Artifact Output**: `android/app/build/outputs/apk/release/app-release.apk`

---

## 9. Testing Checklist
- [ ] **Microphone**: Verify `PermissionsAndroid` rationale appears and recording starts.
- [ ] **Noise Suppression**: Validate clean audio output in noisy environments.
- [ ] **Amplification**: Confirm gain increments (0-30dB) affect the TTS volume.
- [ ] **LLM Connectivity**: Test translation with active internet; verify "Quota Exceeded" handling.
- [ ] **Offline Behavior**: Ensure amplification and UI persistence work without internet.

---

## 10. Technical Constraints & Stability Notes
- **Latency**: STT/LLM pipeline is subject to network speeds; typical round-trip for smart responses is 1.5s - 3s.
- **Hardware Variation**: `NoiseSuppressor` and `LoudnessEnhancer` availability is hardware-dependent; non-supported devices will defaults to raw audio.
- **Security**: Store the API key in a secure manner; currently stored in `AsyncStorage` (non-encrypted).
- **Rate Limits**: Free-tier Gemini keys are limited to 15-60 RPM depending on the model; avoid rapid clicking of analysis triggers.
