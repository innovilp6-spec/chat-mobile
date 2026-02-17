# PROJECT_OVERVIEW: TCS CommBridge (OmniChat)

## 1. Purpose of the Application
**TCS Sankara** (internally referred to as **OmniChat**) is a professional React Native Android application designed to facilitate seamless communication by breaking down language and hearing barriers. The application serves as an assistive tool for in-person conversations, particularly for users with hearing impairments or those communicating across different languages. By combining real-time speech processing with advanced AI, it enables "Face-to-Face" (F2F) and "Audio-to-Audio" (A2A) interaction modes.

## 2. Core Audio Capabilities
The application leverages native Android Audio Effects to enhance the quality and accessibility of voice interactions:
- **Noise Suppression**: Utilizes the native Android `NoiseSuppressor` effect to reduce background noise in real-time. This ensures that speech recognition is more accurate and that the audio heard by users is cleaner.
- **Amplification (Loudness Enhancement)**: Implements the native `LoudnessEnhancer` module, allowing users to boost the audio output by up to **30dB**. This feature is specifically designed to assist users with hearing difficulties during live conversations.

## 3. LLM-Based Text Processing Role
The application integrates the **Google Gemini 2.0 Flash** model to handle complex linguistic and analytical tasks:
- **Dynamic Smart Responses**: Analyzes the conversation context to suggest three natural-sounding, polite replies in the partner's language, helping users maintain the flow of conversation.
- **Speech Emotion Recognition (SER)**: Analyzes audio characteristics (pitch, tone, pace) via LLM to classify the emotional state of the speaker (e.g., Happy, Angry, Excited) and provides a confidence score.
- **Conversation Summarization**: Generates concise summaries of long conversations, highlighting key points and emotional context for later review.

## 4. High-Level Runtime Flow
1. **Audio Capture**: Input is captured via the microphone using `@react-native-voice/voice` for transcription or native recording for analysis.
2. **Native Processing**: The `NoiseSuppressor` and `LoudnessEnhancer` Kotlin modules process the audio session directly at the OS level.
3. **AI Analysis**: Transcribed text or compressed audio data (processed via `react-native-compressor`) is sent to the **Gemini API**.
4. **Contextual UI Update**: The Redux-managed state updates the chat UI with original text, translations, and smart response bubbles.
5. **Speech Synthesis**: The final processed/translated text is spoken back to the user using `react-native-tts`, routed through the amplified audio session.

## 5. Offline vs. Online Behavior
- **Offline Capabilities**:
  - UI Navigation and conversation history (via Redux Persist).
  - Native Audio Amplification (Loudness Enhancement).
  - Native Noise Suppression (hardware dependent).
- **Online Dependencies**:
  - **Speech-to-Text**: Voice recognition services require connectivity.
  - **AI Features**: Translation, Smart Responses, SER, and Summarization require active access to the Google Gemini API.

## 6. Technology Stack
- **Framework**: React Native 0.74.2 (Android)
- **Programming Languages**: JavaScript (React), Kotlin (Native Modules)
- **AI Engine**: Google Generative AI (`gemini-2.0-flash`)
- **State Management**: Redux Toolkit with Redux Persist
- **Core Libraries**:
  - `@react-native-voice/voice`: For speech recognition.
  - `react-native-tts`: For text-to-speech synthesis.
  - `react-native-fs` & `@react-native-community/audio-toolkit`: For audio file and recording management.
  - `react-native-compressor`: For optimizing audio payloads for AI processing.
  - `@react-navigation/native`: For application routing.

## 7. Known Constraints
- **Hardware Variation**: The availability of `NoiseSuppressor` and `LoudnessEnhancer` is dependent on the specific Android device hardware and OS version.
- **API Requirements**: Full functionality requires a valid Google Gemini API Key stored in the application's local storage.
- **Language Scope**: Current optimization is focused on English and major Indian regional languages (Hindi, Marathi, Telugu).
- **Network Latency**: The speed of translation and smart responses is subject to network stability and API response times.
