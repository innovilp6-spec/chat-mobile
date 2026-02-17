/**
 * System prompt for Speech Emotion Recognition (SER).
 * Instructs the Gemini model to analyze the emotional tone of an audio clip.
 */
export const sERPrompt = `
        - Surprised 😲
        - Fear 😨
        - Disgust 🤢
        - Neutral 😐
        - Excited 🤩

        Respond in JSON format: {"emotion": "emotion_name", "emoji": "emoji", "confidence": 0.85}
`;