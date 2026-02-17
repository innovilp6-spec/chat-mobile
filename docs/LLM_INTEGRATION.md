# LLM INTEGRATION: TCS Sankara (OmniChat)

This document details how the TCS Sankara application orchestrates interactions with the **Google Gemini** Large Language Model (LLM) for translation, contextual awareness, and audio analysis.

## 1. API Configuration
The application integrates directly with the **Google Generative AI SDK** (`@google/generative-ai`) without a middle-tier backend.
- **Provider**: Google AI (Gemini).
- **Primary Model**: `gemini-2.0-flash` (used for translations, smart responses, and summaries).
- **Analysis Model**: `gemini-1.5-flash-lite-preview-06-17` (optionally used for optimized audio analysis).
- **Authentication**: User-provided API Keys are stored locally in `AsyncStorage` under the key `@gemini_api_key`.

## 2. Request Payload Structure
The application constructs three primary types of payloads:
- **Text-to-Text (Translation)**: A simple string prompt instructing the model to translate between specific source and target languages (e.g., "Translate the following text from en to hi").
- **Chat Context (Smart Responses)**: A formatted string representing conversation history:
  ```text
  UserA: Hi, how are you?
  UserB: I am doing well, thank you!
  ```
  Sent with a system instruction to return a JSON array of 3 strings.
- **Multimodal (Audio Analysis)**: A request containing a system prompt and an `inlineData` object with:
  - `data`: Base64 encoded string of the compressed audio file.
  - `mimeType`: `audio/wav`.

## 3. Response Handling
- **Structured Data**: For Smart Responses and Emotion Analysis, the application uses regex (`replace(/```json/i, "")`) to strip markdown decorators from the LLM output before performing `JSON.parse()`.
- **Textual Data**: For translations, results are trimmed of whitespace and directly applied to the message object.
- **Content Filtering**: The application assumes default safety settings from the SDK, as no explicit safety overrides are implemented in the current codebase.

## 4. Error Handling
The integration implements a classification-based error handling strategy:
- **API Key Errors (401/403)**: Triggers a modal popup asking the user to update their credentials.
- **Quota/Rate Limits (429)**: Displays a specific "Quota Exceeded" message via `showToastInfo`.
- **General Failures**: Logged to the console with a fallback toast indicating "Translation/Generation failed."

## 5. Rate Limiting Considerations
To prevent "Too Many Requests" errors, especially on free-tier keys:
- **Explicit Delays**: The `anayzeAudio` module includes a hardcoded 5000ms delay (`delayBetweenRequests`) between consecutive calls.
- **Optimized Frequency**: The `OPTIMAL_CONFIG` limits processing to a maximum of 12 requests per minute.
- **Loading Guards**: UI buttons are disabled or set to a loading state during active requests to prevent duplicate submissions.

## 6. Timeout Behavior
As the SDK doesn't expose a direct timeout parameter in the initialization, the application relies on the underlying `fetch` implementation. If a request hangs, the component's `isLoading` state remains active until the promise either resolves or the environment triggers a network timeout, which is then caught by the global `try/catch` block.

## 7. UI State Updates
State updates follow a predictable pattern:
1. **Initiation**: `setIsLoadingResponses(true)` or `setIsLoadingSummary(true)` updates the UI with spinners.
2. **Success**:
   - Translations are dispatched to the **Redux Store** to persist across navigation.
   - Smart responses are set in the **Local Component State** (`setSmartResponses`) to populate response bubbles.
3. **Completion**: `setIsLoading(false)` is called in the `finally` block to restore UI interactivity.

## 8. Failure Fallback Behavior
- **Translations**: If a translation fails, the UI displays `(Translation failed)` to notify the user.
- **Emotion Analysis**: Returns a default `{ emotion: "neutral", emoji: "😐", confidence: 0.5 }` object to ensure the UI doesn't crash.
- **Smart Responses**: Returns an empty array, hiding the suggestion bubbles from the user.

## 9. Data Privacy Considerations
- **Local Storage**: API keys are stored only on the device's local filesystem (`AsyncStorage`).
- **Data in Transit**: Requests are sent directly from the device to Google's servers over HTTPS.
- **No Persistence**: The application does not include a backend to log conversations; all history is stored locally in the Redux store.
- **Audio Disposal**: Compressed audio files used for analysis are deleted from the device's cache immediately after the LLM request completes via `RNFS.unlink`.
