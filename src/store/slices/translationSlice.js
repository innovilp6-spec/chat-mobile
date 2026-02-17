import { GoogleGenerativeAI } from "@google/generative-ai";
import { showToastInfo } from '../../utils/toasts';

// Action types
const SET_USER_A_LANGUAGE = "SET_USER_A_LANGUAGE";
const SET_USER_B_LANGUAGE = "SET_USER_B_LANGUAGE";
const SET_TRANSLATION = "SET_TRANSLATION";

/**
 * Action creator to set the language for User A.
 */
export const setUserALanguage = (language) => ({
    type: SET_USER_A_LANGUAGE,
    payload: language,
});

/**
 * Action creator to set the language for User B.
 */
export const setUserBLanguage = (language) => ({
    type: SET_USER_B_LANGUAGE,
    payload: language,
});

/**
 * Action creator to store a translation for a specific message ID.
 */
export const setTranslation = (messageId, translation) => ({
    type: SET_TRANSLATION,
    payload: { messageId, translation },
});

const initialState = {
    userALanguage: "en",
    userBLanguage: "en",
    translations: {}, // Maps messageId -> translatedText
};

/**
 * Asynchronous thunk to translate text using the Google Gemini API.
 * @param {string} text - The source text to translate.
 * @param {string} messageId - The unique ID of the message.
 * @param {boolean} isUserA - Whether the source text is from User A.
 * @param {string} apiKey - The Gemini API key.
 */
export const translateText = (text, messageId, isUserA, apiKey) => {
    return async (dispatch, getState) => {
        try {
            const { userALanguage, userBLanguage } = getState().translation;
            const targetLanguage = isUserA ? userBLanguage : userALanguage;
            const sourceLanguage = isUserA ? userALanguage : userBLanguage;

            // Avoid redundant translation if languages are identical
            if (sourceLanguage === targetLanguage) return;

            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({
                model: "gemini-2.0-flash"
            });

            const prompt = `
            Translate the following text from ${sourceLanguage} to ${targetLanguage}:
            "${text}"
            
            Respond with ONLY the translation, no explanations or additional text.
            `;

            const result = await model.generateContent(prompt);

            if (!result || !result.response) {
                throw new Error('Empty response from API');
            }

            const translation = result.response.text().trim();
            dispatch(setTranslation(messageId, translation));

        } catch (error) {
            console.error('Translation error:', error);

            if (error.message?.includes('API_KEY_INVALID')) {
                showToastInfo('Invalid API key. Please check your settings.', true);
            } else if (error.message?.includes('quota')) {
                showToastInfo('API quota exceeded. Please update API key or upgrade plan.', true);
            } else if (error.message?.includes('rate')) {
                showToastInfo('Too many requests. Please try again in a moment.', true);
            } else {
                showToastInfo('Translation failed. Please try again.', true);
            }

            // Mark translation as failed in the store to inform the UI
            dispatch(setTranslation(messageId, '(Translation failed)'));
        }
    };
};

/**
 * Reducer for managing translation state.
 */
const translationReducer = (state = initialState, action) => {
    switch (action.type) {
        case SET_USER_A_LANGUAGE:
            return {
                ...state,
                userALanguage: action.payload,
            };
        case SET_USER_B_LANGUAGE:
            return {
                ...state,
                userBLanguage: action.payload,
            };
        case SET_TRANSLATION:
            return {
                ...state,
                translations: {
                    ...state.translations,
                    [action.payload.messageId]: action.payload.translation,
                },
            };
        default:
            return state;
    }
};

export default translationReducer;
