# DATA FLOW: TCS Sankara (OmniChat)

This document provides a step-by-step description of the runtime data flow and logic execution within the TCS Sankara application.

## 1. App Launch Flow
1. **Bootstrap**: `index.js` calls `AppRegistry` to mount the `App` component.
2. **Hydration**: `PersistGate` (in `App.tsx`) blocks rendering until `redux-persist` has successfully loaded the `translation` slice (language settings) from `AsyncStorage`.
3. **Route Initialization**: `NavigationContainer` loads the `HomeScreen`.
4. **Credential Verification**: When the user navigates to a conversation screen (`A2AScreen` or `F2FScreen`), a `useFocusEffect` hook attempts to retrieve the `@gemini_api_key` from local storage. If missing, the API Key Modal is automatically displayed.

## 2. User Audio Interaction Flow
1. **Trigger**: User taps the Mic button on the chat screen.
2. **Permission Check**: The app executes `checkMicrophonePermission()`. If granted, the flow continues.
3. **Initialization**: `Voice.start()` is called. Simultaneously, `NoiseSuppressor.initialize(0)` is invoked to prepare the native audio filter.
4. **Real-time Transcription**: The `@react-native-voice/voice` service captures speech. Partial results may be shown, but the final text is captured in the `onSpeechResults` callback.
5. **Message Commit**: The captured text is passed to `addMessage()`, which generates a unique ID, identifies the speaker (User A vs. User B), and updates the local message history.

## 3. Noise Suppression and Amplification Pipeline
1. **Setup**: The `NoiseSuppressor` is attached to the hardware capture session at the OS level upon microphone activation.
2. **User Control**: When a user moves the gain slider, `setGainValue` updates the React state.
3. **Native Execution**: `onSlidingComplete` triggers `LoudnessEnhancer.setGain(gainValue)`. This sends a command through the JS Bridge to the Kotlin module.
4. **Active Processing**: The Android `LoudnessEnhancer` effect amplifies all audio routed through the current session (including Tts output) in real-time.
5. **Output**: Synthesized text from `Tts.speak()` is played back, inheriting the loudness and suppression characteristics of the session.

## 4. LLM Request Lifecycle
1. **Formatting**: Converstation history is serialized into a plain-text format (e.g., `UserA: Message \n UserB: Message`).
2. **Payload Construction**: A prompt is created (Translation, Smart Response, or Summarization) and combined with the formatted history.
3. **Transmission**: The `GoogleGenerativeAI` SDK sends the request to Gemini over HTTPS.
4. **Parsing**: The raw string response is processed; for JSON-expected responses (Smart Responses), markdown code blocks are stripped using regex before `JSON.parse()`.
5. **Cleanup**: If multimodal audio analysis was performed, the temporary file created by `react-native-compressor` is deleted via `RNFS.unlink()`.

## 5. Redux State Update Flow
1. **Dispatch**: The `translateText` thunk is called with the new message content.
2. **Async Execution**: The thunk performs the translation via Gemini.
3. **Update**: Upon success, a `SET_TRANSLATION` action is dispatched with the `messageId` and `translation` text.
4. **State Mapping**: The `translationReducer` updates the `translations` lookup table.
5. **Reactivity**: Any component using `useSelector(state => state.translation.translations)` detects the new reference and re-renders the message list to show the translated text bubble.

## 6. Error Handling Flow
1. **Detection**: Errors are caught in `try/catch` blocks surrounding native bridge calls and API requests.
2. **Classification**: 
   - **Network/Quota**: Reported via `showToastInfo` to the user.
   - **Authentication**: Triggers the `setModalVisible(true)` state to prompt for a new API key.
   - **Hardware**: For native modules like `NoiseSuppressor`, a rejected promise is caught and reported as an `Alert` if the hardware is incompatible.
3. **Recovery**: Life-cycle hooks (`useFocusEffect` cleanup) ensure that `Voice` and `Recorder` resources are released even if a crash occurs in the main logic flow.
