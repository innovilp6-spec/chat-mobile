# Gemini API Key Validation - Debug Logging Guide

## Overview
Comprehensive logging has been added to the A2AScreen component to help debug API key validation and API calls. All logs are sent to the React Native console.

## Correct API Usage

### Import
```javascript
import { GoogleGenerativeAI } from '@google/generative-ai';
// NOT 'googlegenai' - it's '@google/generative-ai'
```

### Usage Pattern
```javascript
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
const response = await model.generateContent('your prompt');
```

---

## Logging Areas

### 1. **API Key Format Validation** (`validateApiKeyFormat`)
```
🔍 Validating API key format...
   Key length: XX
   Key starts with AIza: true/false
✅ API key format validation passed
```

**What it checks:**
- Key length is at least 20 characters
- Key starts with "AIza" (Google API key prefix)

---

### 2. **API Key Validation & Save** (`validateAndSaveKey`)

#### Success Flow:
```
📝 === VALIDATING NEW API KEY === 
   Key length: XX
   Key preview: AIza...XXXX

1️⃣ Step 1: Validating API key format...
2️⃣ Step 2: Initializing GoogleGenerativeAI with key...
   ✅ GoogleGenerativeAI instance created
3️⃣ Step 3: Getting generative model (gemini-2.0-flash)...
   ✅ Model instance created
4️⃣ Step 4: Testing API call with minimal prompt ("ping")...
   ✅ API call successful!
   Response status: 200
   Response text length: XX
5️⃣ Step 5: Saving API key to AsyncStorage...
   ✅ API key saved successfully!

✨ === API KEY VALIDATION COMPLETE ===
```

#### Error Flow:
```
❌ === API KEY VALIDATION FAILED ===
Error object: {...}
Error type: GoogleGenerativeAIError
Error status: 403
Error message: "API not enabled"

🔍 Error classification:
   Classification: API NOT ENABLED

Error details:
   - name: GoogleGenerativeAIError
   - statusText: FORBIDDEN
   - Full JSON: {...}

 === ERROR HANDLING COMPLETE ===
```

---

### 3. **API Key Initialization on Screen Focus** (`useFocusEffect`)

```
🔑 === INITIALIZING API KEY ON FOCUS ===
1️⃣ Retrieving saved API key from AsyncStorage...
   ✅ API key found! Length: XX
   Key preview: AIza...XXXX
   ✅ API key set in state

✨ === API KEY INITIALIZATION COMPLETE ===
```

---

### 4. **Smart Response Generation** (`generateSmartresponse`)

#### Success Flow:
```
📨 === GENERATING SMART RESPONSES ===
   API Key exists: true
   API Key length: XX
   Current user: User A
   Generate response in: hi-IN

1️⃣ Initializing GoogleGenerativeAI...
   ✅ GoogleGenerativeAI instance created
2️⃣ Getting model: gemini-2.0-flash
   ✅ Model instance created
3️⃣ Formatting chat history...
   Context length: XXXX characters

   ✅ Generated 3 smart responses

✨ === SMART RESPONSE GENERATION COMPLETE ===
```

#### Error Flow:
```
❌ === SMART RESPONSE GENERATION FAILED ===
Error: {...}
Error type: GoogleGenerativeAIError
Error status: 403
Error message: "API not enabled"

🔍 Error classification:
   Classification: API NOT ENABLED

 === ERROR HANDLING COMPLETE ===
```

---

## How to View Logs

### Android (React Native)
1. **Using React Native Debugger:**
   - Run: `npx react-native log-android`
   - Or: `adb logcat *:S ReactNative:V`

2. **Using Android Studio:**
   - Tools → Device Manager → Run device
   - Logcat tab → Search for your app name

### iOS
1. **Using Xcode Console:**
   - Run the app with Xcode
   - Console tab shows all logs

2. **Using React Native Debugger:**
   - Press Cmd+D on simulator
   - Select "Debug JS Remotely"

---

## Troubleshooting Guide

### Issue: "API not enabled"
**Logs will show:**
```
Error status: 403
Classification: API NOT ENABLED
```

**Solution:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project
3. Go to APIs & Services → Enabled APIs
4. Search for "Google Generative AI"
5. Click "Enable" if not already enabled
6. Verify the API key is associated with this project

---

### Issue: "Invalid API key"
**Logs will show:**
```
Error status: 401
Classification: INVALID API KEY
```

**Solution:**
1. Verify you copied the API key correctly
2. Check that the key hasn't been revoked
3. Generate a new API key from [Google AI Studio](https://aistudio.google.com)

---

### Issue: "Quota exceeded"
**Logs will show:**
```
Error status: 429
Classification: QUOTA EXCEEDED
```

**Solution:**
1. Upgrade your API plan
2. Wait for quota to reset (usually daily)
3. Use a different API key with available quota

---

### Issue: API Call Hangs/Timeout
**Logs will show:**
- Nothing, or logs stop at step 4

**Solution:**
1. Check network connection
2. Verify API key is valid and enabled
3. Check if the model name is correct
4. Try with a different network

---

## Key Information

- **Correct Package:** `@google/generative-ai` (NOT `googlegenai`)
- **Correct Import:** `import { GoogleGenerativeAI } from '@google/generative-ai'`
- **Model Used:** `gemini-2.0-flash` (Latest available model)
- **Storage Key:** `@gemini_api_key` (in AsyncStorage)
- **API Key Format:** Must start with "AIza" and be at least 20 characters

---

## Log Levels

| Icon | Meaning |
|------|---------|
| 📝 | Starting validation |
| 1️⃣-5️⃣ | Steps in the process |
| ✅ | Success |
| ❌ | Error |
| 🔍 | Analyzing error |
| ✨ | Completion |
| 📨 | API request |
| 🔑 | Key initialization |

---

## Testing

To test the API key validation:
1. Open the app
2. Tap the settings icon (⚙️)
3. Enter your Gemini API key
4. Watch the console logs to trace execution
5. Check each log message to identify where it fails
