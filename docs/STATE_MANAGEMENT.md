# STATE MANAGEMENT: TCS Sankara (OmniChat)

This document describes the state management architecture of the TCS Sankara application, which utilizes **Redux** for global data consistency and **Redux Persist** for local data retention.

## 1. Store Structure
The application uses a centralized store configuration in `centralStore.js`. The store is composed through `combineReducers` and augmented with middeleware:
- **Middleware**: `redux-thunk` is integrated to handle asynchronous operations (like LLM interactions).
- **Persistence**: `redux-persist` is configured with `AsyncStorage` to ensure specific state slices survive app termination.
- **Root Reducer**:
  - `translation`: Managed by the `translationSlice`, this is a **whitelisted** reducer for persistent storage.
  - `demo`: Managed by the `demoSlice`, used for transient or demonstration states.

## 2. Slice Responsibilities
### Translation Slice (`translationSlice.js`)
- **State Properties**:
  - `userALanguage`: Preferred language of the primary user.
  - `userBLanguage`: Preferred language of the partner.
  - `translations`: A lookup object mapping `messageId` to its translated string.
- **Primary Role**: Acts as the single source of truth for language settings and cross-language message content.

### Demo Slice (`demoSlice.js`)
- **State Properties**: `demoState`.
- **Primary Role**: Placeholder for prototyping and handling experimental asynchronous data fetching.

## 3. Action Dispatch Flow
The application follows a standard unidirectional data flow:
1. **Trigger**: A UI interaction (e.g., a new message recorded in `A2AScreen.js`) initiates an action.
2. **Dispatch**: The `useDispatch` hook is used to send either a plain object action or a thunk.
3. **Thunk Processing**: For translations, the `translateText` thunk is dispatched. It handles the API call to Gemini and, upon success, dispatches the `SET_TRANSLATION` action.
4. **Reducer Update**: The pure reducer function receives the action and returns a new state object.
5. **UI Update**: Components subscribed via `useSelector` re-render to reflect the new state.

## 4. Async State Handling
Asynchronicity is managed strictly through **Redux Thunk**:
- **Pattern**: Thunks encapsulate the logic for API requests (Google Generative AI SDK).
- **Persistence of Results**: Once the LLM returns a translation, it is stored in the state using the unique ID of the original message. This allows the chat UI to match original and translated text efficiently during render.

## 5. UI Re-render Triggers
Components utilize the `useSelector` hook to bind UI to specific state slices:
- **`A2AScreen` / `F2FScreen`**: These screens subscribe to the `translations` object. Whenever a new translation is added to the store, only the message bubbles associated with that ID (or the entire list, depending on implementation) will re-evaluate, but usually the whole list due to the `translations` object reference change.
- **`HomeScreen`**: Subscribes to `userALanguage` and `userBLanguage` to reflect current picker selections.

## 6. Potential Coupling Risks
- **Message IDs**: The translation logic is tightly coupled to the message generation logic in the screen components (which use `Date.now()` or `nanoid` for IDs). If IDs are not unique or consistent between the UI and Redux, the lookup will fail.
- **API Key Dependency**: The `translateText` thunk requires the `apiKey` as an argument. This means the UI must manage the retrieval and passing of the API key from `AsyncStorage` to the thunk.

## 7. Debugging Tips
- **Persistence Checks**: If language settings are not saving, verify the `whitelist` in `centralStore.js`.
- **Thunk Logs**: Add console logs within the thunks (e.g., in `translateText`) to monitor the lifecycle of the LLM request (Start -> Success/Error -> Dispatch).
- **State Inspection**: Use the Redux DevTools (if enabled in development) or print `getState()` within a thunk to inspect the current structure of the `translations` lookup table.
