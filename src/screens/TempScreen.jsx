import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Animated,
    Dimensions,
    ActivityIndicator
} from 'react-native';
import Icon from "react-native-vector-icons/FontAwesome";
import { useFocusEffect } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Voice from '@react-native-voice/voice';
import { showToastInfo } from '../utils/toasts';
import Tts from 'react-native-tts';
import { LoudnessEnhancer } from '../LoudnessEnhancer';
import { nanoid } from 'nanoid';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Modal from "react-native-modal";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch, useSelector } from 'react-redux';
import { translateText } from '../store/slices/translationSlice';

const TempScreen = () => {
    const [isListening, setIsListening] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState("");
    const [isUser, setIsUser] = useState(true);
    const [isLoudnessEnabled, setIsLoudnessEnabled] = useState(true);
    const [gainValue, setGainValue] = useState(0);
    const [isVolumeVisible, setIsVolumeVisible] = useState(false);
    const [smartResponses, setSmartResponses] = useState(null);
    const [isLoadingResponses, setIsLoadingResponses] = useState(false);
    const [responseOpen, setResponseOpen] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [tempApiKey, setTempApiKey] = useState('');
    const [apiKey, setApiKey] = useState(null);
    const [apiKeyError, setApiKeyError] = useState(null);
    const [isSummaryModalVisible, setSummaryModalVisible] = useState(false);
    const [summaryText, setSummaryText] = useState('');
    const [isLoadingSummary, setIsLoadingSummary] = useState(false);
    const scrollViewRef = useRef(null);
    const slideAnim = useRef(new Animated.Value(-100)).current;
    const [rotateAnimation] = useState(new Animated.Value(1));

    const translations = useSelector(state => state.translation.translations);
    const { userALanguage, userBLanguage } = useSelector(state => state.translation);
    const dispatch = useDispatch();

    const addMessage = useCallback((text) => {
        if (text.trim() === "") return;

        const messageId = Date.now().toString();
        const newMessage = {
            id: messageId,
            isUser: isUser,
            text: text
        };

        setMessages(prev => [...prev, newMessage]);
        setInputText("");

        // Dispatch translation with isUser flag
        dispatch(translateText(text, messageId, isUser, apiKey));

        setIsUser(prev => !prev);
        generateSmartresponse(newMessage);
    }, [apiKey, dispatch, isUser]);

    const toggleResponses = () => {
        setResponseOpen(prev => !prev);
        Animated.spring(rotateAnimation, {
            toValue: responseOpen ? 0 : 1,
            useNativeDriver: true,
            tension: 120,
            friction: 8
        }).start();
    };

    // Add getLanguageCode helper function if not already present
    const getLanguageCode = (language) => {
        const codes = {
            'en': 'en-US',
            'hi': 'hi-IN',
            'mr': 'mr-IN',
            'te': 'te-IN'
        };
        return codes[language] || 'en-US';
    };

    // Update the generateSmartresponse function
    const generateSmartresponse = useCallback(async (newMessage) => {
        if (!apiKey) {
            setModalVisible(true);
            return;
        }

        try {
            setIsLoadingResponses(true);
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite-preview-06-17" });
            const context = messages.map(m => `${m.isUser ? "User" : "Assistant"}: ${m.text}`).join('\n');

            // Determine target language based on who sent the message
            const targetLanguage = isUser ? userBLanguage : userALanguage;

            const prompt = `
            Here is the recent chat: ${context}
            Last message: ${newMessage.text}

            Suggest exactly 3 natural-sounding replies in ${targetLanguage} language that I could send next.
            Each reply should be:
            - Between 4-20 words long
            - Natural and conversational
            - Relevant to the context
            - Different from each other
            - Must be in ${targetLanguage} language

            Respond ONLY with a valid JSON array of 3 strings with no extra text, no markdown, and no explanations.
            `;

            const res = await model.generateContent(prompt);
            const result = res.response.text()
                .replace(/```json/i, "")
                .replace(/```/g, "")
                .trim();

            const parsedResponse = JSON.parse(result);
            const validResponses = parsedResponse.map(item =>
                typeof item === 'string' ? item : item.reply || String(item)
            );

            setSmartResponses(validResponses);
        } catch (error) {
            console.error('Smart response error:', error);
            if (error.message.includes('API key')) {
                setModalVisible(true);
            }
            if (error.message.includes('quota')) {
                showToastInfo('Gemini API quota exceeded. Please update API key or upgrade plan.', true);
            }
            setSmartResponses([]);
        } finally {
            setIsLoadingResponses(false);
        }
    }, [apiKey, messages, userALanguage, userBLanguage, isUser]); // Add all dependencies

    useFocusEffect(
        useCallback(() => {
            const initializeVoice = async () => {
                try {
                    await Voice.destroy();
                    Voice.removeAllListeners();

                    Voice.onSpeechStart = () => {
                        console.log('Speech started');
                        showToastInfo('Listening...', false);
                        setIsListening(true);
                    };

                    Voice.onSpeechResults = (event) => {
                        if (event?.value?.[0]) {
                            addMessage(event.value[0]);
                        }
                        setIsListening(false);
                    };

                    Voice.onSpeechError = () => {
                        setIsListening(false);
                        showToastInfo('Speech recognition error', true);
                    };

                } catch (error) {
                    console.error('Voice initialization error:', error);
                }
            };

            initializeVoice();
            initializeTts();
            return () => {
                Voice.destroy().then(Voice.removeAllListeners);
            };
        }, [isUser])
    );

    // Add this effect for loudness initialization
    useFocusEffect(
        useCallback(() => {
            const initLoudness = async () => {
                try {
                    const initialized = await LoudnessEnhancer.initialize(0);
                    if (initialized) {
                        await LoudnessEnhancer.setGain(gainValue);
                        setIsLoudnessEnabled(true);
                    }
                } catch (error) {
                    console.error('Loudness init error:', error);
                    showToastInfo('Failed to initialize audio enhancement', true);
                }
            };

            initLoudness();

            return () => {
                LoudnessEnhancer.release();
            };
        }, [])
    );

    useFocusEffect(useCallback(() => {
        const lastMessage = messages[messages.length - 1];
        // Only speak the partner's messages, not your own
        if (lastMessage && !lastMessage.isUser) {
            const speakMessage = async () => {
                try {
                    // Stop any current speech recognition before TTS
                    if (Voice.isRecognizing) {
                        await Voice.stop();
                    }

                    await new Promise(resolve => setTimeout(resolve, 500));
                    await Tts.speak(lastMessage.text);
                } catch (error) {
                    console.error('Error speaking message:', error);
                    showToastInfo('Error speaking message', true);
                }
            };

            speakMessage();
        }
        return () => {
            Tts.stop();
        };
    }, [messages]));

    useFocusEffect(
        useCallback(() => {
            loadApiKey();
        }, [])
    );

    const toggleListening = async () => {
        try {
            if (isListening) {
                await Voice.stop();
                setIsListening(false);
            } else {
                await Voice.start('en-US');
            }
        } catch (error) {
            console.error('Voice control error:', error);
        }
    };

    const initializeTts = async () => {
        try {
            await Tts.setDefaultLanguage('en-US');
            await Tts.setDefaultRate(0.5);
            await Tts.setDefaultPitch(1.0);
        } catch (error) {
            console.error('Failed to initialize TTS:', error);
            showToastInfo('Failed to initialize TTS:', false);
        }
    };

    const toggleLoudnessEnhancer = async () => {
        try {
            if (!isLoudnessEnabled) {
                const initialized = await LoudnessEnhancer.initialize(0);
                if (!initialized) {
                    throw new Error('Failed to initialize loudness enhancer');
                }
                await LoudnessEnhancer.setGain(gainValue);
                setIsLoudnessEnabled(true);
            }
        } catch (error) {
            console.error('Error with loudness enhancer:', error);
            showToastInfo('Error with loudness enhancer', true);
            setIsLoudnessEnabled(false);
        }
    };

    const showVolumeControl = () => {
        setIsVolumeVisible(true);
        Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
        }).start();
    };

    const hideVolumeControl = () => {
        Animated.timing(slideAnim, {
            toValue: -100,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            setIsVolumeVisible(false);
        });
    };

    const saveApiKey = async (key) => {
        try {
            await AsyncStorage.setItem('@api_key', key);
            setApiKey(key);
            setModalVisible(false);
            showToastInfo('API key saved successfully', false);
        } catch (error) {
            console.error('Error saving API key:', error);
            setApiKeyError('Failed to save API key');
        }
    };

    const loadApiKey = async () => {
        try {
            const key = await AsyncStorage.getItem('@api_key');
            if (key) {
                setApiKey(key);
            }
        } catch (error) {
            console.error('Error loading API key:', error);
        }
    };

    const validateAndSaveKey = async () => {
        if (!tempApiKey.trim()) {
            setApiKeyError('API key cannot be empty');
            return;
        }

        try {
            const genAI = new GoogleGenerativeAI(tempApiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite-preview-06-17" });
            await model.generateContent('test');
            await saveApiKey(tempApiKey);
            setTempApiKey('');
            setApiKeyError(null);
        } catch (error) {
            console.error('Invalid API key:', error);
            if (error.message?.includes('quota')) {
                showToastInfo('API quota exceeded. Please use a different key.', true);
            }
            setApiKeyError('Invalid API key. Please check and try again.');
        }
    };

    const generateChatSummary = async () => {
        if (!apiKey || messages.length === 0) return;

        try {
            setIsLoadingSummary(true);
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite-preview-06-17" });

            const chatHistory = messages.map(m =>
                `${m.isUser ? "User" : "Assistant"}: ${m.text}`
            ).join('\n');

            const prompt = `
        Summarize the following conversation concisely but comprehensively. 
        Include key points, main topics discussed, and any important conclusions or decisions made.
        Keep emotional context where relevant.

        Conversation:
        ${chatHistory}
        `;

            const result = await model.generateContent(prompt);
            setSummaryText(result.response.text());
            setSummaryModalVisible(true);
        } catch (error) {
            console.error('Summary generation error:', error);
            showToastInfo('Failed to generate summary', true);
        } finally {
            setIsLoadingSummary(false);
        }
    };

    const renderMessageBubble = (message) => {
        const translation = translations[message.id];
        const isUserMessage = message.isUser;

        return (
            <View
                key={message.id}
                style={[
                    styles.messageBubble,
                    isUserMessage ? styles.userBubble : styles.botBubble,
                ]}
            >
                <Text style={styles.messageText}>{message.text}</Text>
                {translation && (
                    <View style={styles.translationContainer}>
                        <Text style={styles.translationLabel}>
                            {isUserMessage ? 'Translated to Partner\'s Language:' : 'Translated to Your Language:'}
                        </Text>
                        <Text style={styles.translationText}>
                            {translation}
                        </Text>
                    </View>
                )}
            </View>
        );
    };

    return (
        <LinearGradient
            colors={['rgb(1,114,178)', 'rgb(0,22,69)']}
            style={styles.container}
        >
            <View style={styles.headerContainer}>
                <View style={styles.headerButtons}>
                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={() => setModalVisible(true)}
                    >
                        <Icon name="cog" size={24} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={() => generateChatSummary()}
                        disabled={messages.length === 0 || isLoadingSummary}
                    >
                        <Icon name="file-text-o" size={24} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={showVolumeControl}
                    >
                        <Icon name="volume-up" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* API Key Modal */}
            <Modal
                isVisible={modalVisible}
                onBackdropPress={() => setModalVisible(false)}
                onBackButtonPress={() => setModalVisible(false)}
                backdropTransitionOutTiming={0}
                style={styles.modal}
            >
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Enter Gemini API Key</Text>
                    <TextInput
                        style={styles.modalInput}
                        value={tempApiKey}
                        onChangeText={setTempApiKey}
                        placeholder="Enter API key"
                        placeholderTextColor="#666"
                    />
                    {apiKeyError && (
                        <Text style={styles.errorText}>{apiKeyError}</Text>
                    )}
                    <TouchableOpacity
                        style={styles.modalButton}
                        onPress={validateAndSaveKey}
                    >
                        <Text style={styles.buttonText}>Save</Text>
                    </TouchableOpacity>
                </View>
            </Modal>

            {/* Summary Modal */}
            <Modal
                isVisible={isSummaryModalVisible}
                onBackdropPress={() => setSummaryModalVisible(false)}
                onBackButtonPress={() => setSummaryModalVisible(false)}
                backdropTransitionOutTiming={0}
                style={{ margin: 20 }}
            >
                <View style={styles.summaryModalContainer}>
                    <Text style={styles.summaryModalTitle}>Chat Summary</Text>
                    <ScrollView style={styles.summaryScrollView}>
                        <Text style={styles.summaryText}>{summaryText}</Text>
                    </ScrollView>
                    <TouchableOpacity
                        style={styles.closeSummaryButton}
                        onPress={() => setSummaryModalVisible(false)}
                    >
                        <Text style={styles.buttonText}>Close</Text>
                    </TouchableOpacity>
                </View>
            </Modal>

            {/* Volume Overlay */}
            {isVolumeVisible && (
                <TouchableOpacity
                    style={styles.overlay}
                    activeOpacity={1}
                    onPress={hideVolumeControl}
                >
                    <Animated.View
                        style={[
                            styles.volumePanel,
                            { transform: [{ translateX: slideAnim }] }
                        ]}
                    >
                        <View style={styles.volumeContent}>
                            <Icon name="volume-up" size={24} color="#fff" />
                            <TouchableOpacity
                                style={styles.volumeButton}
                                onPress={async () => {
                                    const newValue = Math.min(gainValue + 1, 30);
                                    setGainValue(newValue);
                                    if (isLoudnessEnabled) {
                                        await LoudnessEnhancer.setGain(Math.round(newValue));
                                    }
                                }}
                            >
                                <Icon name="plus" size={24} color="#fff" />
                            </TouchableOpacity>
                            <Text style={styles.volumeText}>{Math.round(gainValue)}dB</Text>
                            <TouchableOpacity
                                style={styles.volumeButton}
                                onPress={async () => {
                                    const newValue = Math.max(gainValue - 1, 0);
                                    setGainValue(newValue);
                                    if (isLoudnessEnabled) {
                                        await LoudnessEnhancer.setGain(Math.round(newValue));
                                    }
                                }}
                            >
                                <Icon name="minus" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </TouchableOpacity>
            )}

            <ScrollView
                ref={scrollViewRef}
                contentContainerStyle={styles.chatContainer}
                onContentSizeChange={() => scrollViewRef.current.scrollToEnd({ animated: true })}
            >
                {messages.map((message) => renderMessageBubble(message))}
            </ScrollView>

            <View style={styles.inputContainer}>
                {smartResponses && (
                    <TouchableOpacity
                        onPress={toggleResponses}
                        style={styles.toggleButton}
                    >
                        <Animated.View style={{
                            transform: [{
                                rotate: rotateAnimation.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: ['0deg', '180deg']
                                })
                            }]
                        }}>
                            <Icon name="chevron-up" size={20} color="rgb(1,114,178)" />
                        </Animated.View>
                    </TouchableOpacity>
                )}
                {smartResponses && responseOpen && (
                    <>
                        {isLoadingResponses ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator color="rgb(1,114,178)" />
                                <Text style={styles.loadingText}>Generating responses...</Text>
                            </View>
                        ) : (
                            <View style={styles.smartResponsesContainer}>
                                {smartResponses.map((response) => (
                                    <TouchableOpacity
                                        key={nanoid()}
                                        style={styles.smartResponseButton}
                                        onPress={() => addMessage(response)}
                                    >
                                        <Text style={styles.smartResponseText}>{response}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </>
                )}
                <View style={styles.inputRow}>
                    <TouchableOpacity
                        style={styles.micButton}
                        onPress={toggleListening}
                    >
                        <Icon
                            name={isListening ? "stop-circle" : "microphone"}
                            size={30}
                            color={isListening ? "red" : "rgb(1,114,178)"}
                        />
                    </TouchableOpacity>
                    <TextInput
                        style={styles.input}
                        placeholder="Type a message..."
                        placeholderTextColor="rgb(1,114,178)"
                        value={inputText}
                        onChangeText={setInputText}
                    />
                    <TouchableOpacity
                        disabled={inputText.trim() === ""}
                        onPress={() => addMessage(inputText)}
                        style={styles.sendButton}
                    >
                        <Icon name="send" size={25} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerContainer: {
        height: 70,
        backgroundColor: 'transparent',
        zIndex: 100,
        paddingTop: 20,
    },
    headerButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingHorizontal: 20,
    },
    headerButton: {
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 20,
        padding: 10,
        marginLeft: 10,
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.1)',
        zIndex: 1000,
    },
    volumePanel: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        width: 80,
        backgroundColor: 'rgba(0,0,0,0.8)',
        paddingVertical: 20,
    },
    volumeContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'space-evenly',
    },
    volumeButton: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        padding: 12,
        borderRadius: 25,
        marginVertical: 10,
    },
    volumeText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    chatContainer: {
        padding: 10,
        paddingTop: 0, // Remove top padding since header has its own space
    },
    messageBubble: {
        maxWidth: '70%',
        padding: 10,
        borderRadius: 10,
        marginBottom: 10,
    },
    userBubble: {
        alignSelf: 'flex-end',
        backgroundColor: '#fff',
    },
    botBubble: {
        alignSelf: 'flex-start',
        backgroundColor: '#fff',
    },
    messageText: {
        fontSize: 16,
        color: "#000"
    },
    inputContainer: {
        flexDirection: 'column',
        backgroundColor: '#fff',
        paddingBottom: 10,
        paddingTop: 2,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    input: {
        flex: 1,
        borderWidth: 2,
        borderColor: 'rgb(1,114,178)',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 10,
        marginHorizontal: 10,
        color: "rgb(1,114,178)",
        fontSize: 15,
    },
    micButton: {
        padding: 10,
    },
    sendButton: {
        padding: 10,
        backgroundColor: 'rgb(1,114,178)',
        borderRadius: 20,
    },
    sliderContainer: {
        position: 'absolute',
        right: 20,
        top: '50%',
        transform: [{ translateY: -100 }],
        height: 200,
        width: 50,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    slider: {
        width: 200,
        height: 40,
        transform: [{ rotate: '-90deg' }],
    },
    sliderText: {
        color: '#FFFFFF',
        fontSize: 16,
        marginTop: 10,
        textAlign: 'center',
    },
    toggleButton: {
        alignSelf: 'center',
        padding: 8,
        marginTop: 4,
        backgroundColor: 'rgba(1,114,178,0.1)',
        borderRadius: 20,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingContainer: {
        padding: 12,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: 'rgba(1,114,178,0.2)',
    },
    loadingText: {
        color: 'rgb(1,114,178)',
        marginTop: 4,
        fontSize: 12,
    },
    smartResponsesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 8,
        gap: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(1,114,178,0.2)',
    },
    smartResponseButton: {
        backgroundColor: 'rgba(1,114,178,0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: 'rgb(1,114,178)',
    },
    smartResponseText: {
        color: 'rgb(1,114,178)',
        fontSize: 14,
    },
    modal: {
        justifyContent: 'center',
        margin: 20,
    },
    modalContent: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'rgb(1,114,178)',
        marginBottom: 15,
        textAlign: 'center',
    },
    modalInput: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        padding: 10,
        marginBottom: 15,
        color: '#000',
    },
    modalButton: {
        backgroundColor: 'rgb(1,114,178)',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    errorText: {
        color: 'red',
        marginBottom: 10,
    },
    summaryModalContainer: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
        maxHeight: '80%',
    },
    summaryModalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'rgb(1,114,178)',
        marginBottom: 15,
        textAlign: 'center',
    },
    summaryScrollView: {
        maxHeight: '80%',
        marginBottom: 15,
    },
    summaryText: {
        fontSize: 16,
        color: '#333',
        lineHeight: 24,
    },
    closeSummaryButton: {
        backgroundColor: 'rgb(1,114,178)',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    translationContainer: {
        marginTop: 5,
        paddingTop: 5,
        borderTopWidth: 1,
        borderTopColor: 'rgba(1,114,178,0.2)',
    },
    translationLabel: {
        fontSize: 12,
        color: 'rgb(1,114,178)',
        fontStyle: 'italic',
        marginBottom: 2,
    },
    translationText: {
        fontSize: 14,
        color: 'rgb(1,114,178)',
        fontStyle: 'italic',
    },
});

export default TempScreen;