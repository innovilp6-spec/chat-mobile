# ARCHITECTURE: TCS Sankara (OmniChat)

This document outlines the internal system architecture and implementation patterns of the TCS Sankara React Native application.

## 1. Project Structure Breakdown
The repository follows a standard React Native directory structure with specific modules for native bridging and state management:
- **/android**: Contains the native Kotlin implementations for specialized audio modules.
- **/src**: The root of the JavaScript/TypeScript source code.
  - **/screens**: Core UI components representing the application's primary views (`HomeScreen`, `A2AScreen`, `F2FScreen`).
  - **/store**: Redux state management configuration and feature slices.
  - **/utils**: Utility functions for connectivity, toasts, file management, and LLM prompts.
  - **/constants.js**: Centralized configuration for supported languages and screen names.
  - **/NoiseSuppressor.ts / /LoudnessEnhancer.ts**: JavaScript interfaces for the native Android modules.

## 2. App Initialization Flow
The application follows a linear initialization path:
1. **Entry Point**: `index.js` registers the `App` component.
2. **Provider Setup**: `App.tsx` wraps the application in a Redux `Provider` and a `PersistGate` to handle state hydration.
3. **Navigation Mounting**: The `NavigationContainer` initializes the `NativeStack` with `Home` as the default route.
4. **Hydration**: `redux-persist` restores previous language settings and conversation metadata from `AsyncStorage`.

## 3. Navigation Architecture
The app uses `@react-navigation/native-stack` for a lightweight, performant navigation experience:
- **Home**: Language selection and entry point to conversation modes.
- **A2A (Audio-to-Audio)**: The primary interaction hub for multilingual conversation.
- **F2F (Face-to-Face)**: Shared screen interaction mode.
- **Launch/Temp**: Utility screens for splash handling and internal testing.

## 4. Redux State Management Structure
State is managed via **Redux Toolkit** with a centralized store (`centralStore.js`):
- **Translation Slice**: Manages `userALanguage`, `userBLanguage`, and a `translations` lookup table.
- **Demo Slice**: Handles miscellaneous demonstration state.
- **Persistence**: The `translation` slice is whitelisted for persistent storage, ensuring user language preferences survive app restarts.

## 5. Audio Processing Architecture
The application implements a hybrid audio architecture using Native Bridges:
- **Native Level (Kotlin)**:
  - `NoiseSuppressorModule`: Bridges the Android `android.media.audiofx.NoiseSuppressor` to clean input signals.
  - `LoudnessEnhancerModule`: Controls `android.media.audiofx.LoudnessEnhancer` to provide target gain (up to 30dB) at the audio session level.
- **Bridge Level (TypeScript)**: Standardized interfaces ensure type safety when calling native `initialize`, `setGain`, and `release` methods.
- **Application Level**: Screens subscribe to audio events via `@react-native-voice/voice` for transcription and `react-native-tts` for synthesized output.

## 6. LLM Request Orchestration
The application uses **Google Gemini 2.0 Flash** for its intelligence layer, orchestrated through two primary patterns:
- **Thunk-Based (Global)**: The `translateText` thunk handles text-to-text translation within the Redux flow, allowing translations to be updated globally.
- **Screen-Based (Contextual)**: `generateSmartresponse` and `anayzeAudio` (SER) are managed within the screen components to maintain tight coupling between UI state and transient AI output.
- **Compression Pipeline**: Audio files are compressed using `react-native-compressor` (PCM to MP3/AAC) before being sent as base64 payloads to minimize latency and bandwidth.

## 7. Async Handling Strategy
- **Redux Thunk**: Used for side effects that impact global state (e.g., API calls that update the message list or translations).
- **React Hooks**: `useCallback` and `useFocusEffect` manage screen-specific lifecycle events, such as initializing voice listeners or loading API keys.
- **Atomic Promises**: Heavy operations like audio compression and file I/O are handled as standalone `async/await` blocks to prevent blocking the UI thread.

## 8. Error Handling Design
A multi-tier error handling strategy is implemented:
- **User Feedback**: Toast notifications (`showToastInfo`) provide non-intrusive status updates for background tasks (e.g., "Analyzing audio...").
- **Graceful Degradation**: If an AI request fails (e.g., quota exceeded), the system falls back to a neutral state or specific error placeholders in the UI.
- **Safety Checks**: Connectivity is verified via `NetInfo` before network-dependent operations.

## 9. Performance Considerations
- **Audio Payload Optimization**: Targeted sample rates (22050Hz) and bitrates (64kbps) are used for AI analysis to strike a balance between accuracy and speed.
- **Asset Cleanup**: Temporary audio files generated during transcription or analysis are explicitly unlinked (`RNFS.unlink`) after use to prevent storage bloat.
- **Rate Limiting**: Intentional delays are introduced between sequential LLM calls in specific modules to stay within free-tier API quotas.

## 10. Architectural Risks
- **Security**: The current implementation stores the Google Gemini API key in `AsyncStorage` in plaintext, which is a risk on non-encrypted devices.
- **Hardware Coupling**: The core audio enhancement features rely on specific Android `audiofx` availability, leading to inconsistent behavior across different hardware OEMs.
- **LLM Latency**: Real-time conversation flow is highly dependent on the response time of the external Gemini API.
