export const sERPrompt = `
    Analyze this audio clip for emotional content. Based on the vocal characteristics like:
        - Pitch variations and tone
        - Speaking pace and rhythm
        - Energy level and intensity
        - Voice quality and articulation

        Classify the primary emotion into one of these categories and provide an appropriate emoji:
        - Happy 😊
        - Sad 😢
        - Angry 😠
        - Surprised 😲
        - Fear 😨
        - Disgust 🤢
        - Neutral 😐
        - Excited 🤩

        Respond in JSON format: {"emotion": "emotion_name", "emoji": "emoji", "confidence": 0.85}
`;