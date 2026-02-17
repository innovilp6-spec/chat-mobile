import React, { useState, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ScrollView,
    TextInput,
    Animated,
    ActivityIndicator,
    Platform,
    PermissionsAndroid
} from 'react-native';
import 'react-native-get-random-values';
import Icon from "react-native-vector-icons/FontAwesome";
import { useFocusEffect } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Slider from '@react-native-community/slider';
import { NoiseSuppressor } from '../NoiseSuppressor';
import { LoudnessEnhancer } from '../LoudnessEnhancer';
import Voice from '@react-native-voice/voice';
import Tts from 'react-native-tts';
import { GoogleGenerativeAI } from '@google/generative-ai';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Modal from 'react-native-modal';
import RNFS from "react-native-fs";
import { showToastInfo } from '../utils/toasts';
import { nanoid } from 'nanoid';
import { useDispatch, useSelector } from 'react-redux';
import { translateText } from '../store/slices/translationSlice';


/**
 * A2AScreen Component.
 * Implements the Audio-to-Audio conversation logic, including speech recognition,
 * translation, smart responses, and native audio effects (Noise Suppression / Loudness).
 */
const A2AScreen = () => {
    // UI and Logic States
    const [isListening, setIsListening] = useState(false);
    const [isLoudnessEnabled, setIsLoudnessEnabled] = useState(false);
    const [gainValue, setGainValue] = useState(0);
    const [recordedText, setRecordedText] = useState('');
    const [error, setError] = useState(null);
    const [smartResponses, setSmartResponses] = useState(null);
    const [inputText, setInputText] = useState("");
    const [isLoadingResponses, setIsLoadingResponses] = useState(false);
    const [isSummaryModalVisible, setSummaryModalVisible] = useState(false);
    const [summaryText, setSummaryText] = useState('');
    const [isLoadingSummary, setIsLoadingSummary] = useState(false);
    const scrollViewRef = useRef(null);
    const [isUser, setIsUser] = useState(true); // Toggle between User A and User B
    const [messages, setMessages] = useState([]);
    const [responseOpen, setResponseOpen] = useState(true);
    const [rotateAnimation] = useState(new Animated.Value(1));

    // API and Configuration States
    const [apiKey, setApiKey] = useState(null);
    const [isModalVisible, setModalVisible] = useState(false); // API Key input modal
    const [tempApiKey, setTempApiKey] = useState('');
    const [apiKeyError, setApiKeyError] = useState(null);
    const [filePath, setFilePath] = useState("");

    // Global State Selectors
    const dispatch = useDispatch();
    const translations = useSelector(state => state.translation.translations);
    const { userALanguage, userBLanguage } = useSelector(state => state.translation);

    /**
     * Request microphone permissions from the Android OS.
     */
    const checkMicrophonePermission = async () => {
        if (Platform.OS === 'android') {
            try {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                    {
                        title: 'Microphone Permission',
                        message: 'OmniChat needs access to your microphone',
                        buttonNeutral: 'Ask Me Later',
                        buttonNegative: 'Cancel',
                        buttonPositive: 'OK',
                    }
                );
                return granted === PermissionsAndroid.RESULTS.GRANTED;
            } catch (err) {
                console.error('Error checking microphone permission:', err);
                showToastInfo('Error checking microphone permission:', false);
                return false;
            }
        }
        return true;
    };

    // const startListeningWithNoiseSuppressor = useCallback(async () => {
    //     try {
    //         const hasPermission = await checkMicrophonePermission();
    //         if (!hasPermission) {
    //             showToastInfo('Microphone permission denied', true);
    //             return;
    //         }

    //         setError(null);
    //         setRecordedText('');
    //         setIsListening(true);

    //         // Reset Voice instance
    //         await Voice.destroy();
    //         await Voice.removeAllListeners();

    //         // const noiseSuppressorInitialized = await NoiseSuppressor.initialize(0);
    //         // if (!noiseSuppressorInitialized) {
    //         //     throw new Error('Failed to initialize noise suppressor');
    //         // }
    //         // await NoiseSuppressor.setEnabled(true);

    //         // Use the correct language based on current user
    //         const recognitionLanguage = isUser ? userALanguage : userBLanguage;
    //         const languageCode = getLanguageCode(recognitionLanguage);

    //         console.log('Starting voice recognition in:', languageCode);
    //         await Voice.start("en-US");
    //         // await Voice.start(languageCode);
    //         showToastInfo('Listening...', false);

    //     } catch (error) {
    //         console.error('Error starting voice recognition:', error);
    //         showToastInfo('Failed to start listening: ' + error.message, true);
    //         setError(error.message || 'Failed to start voice recognition');
    //         setIsListening(false);
    //         await cleanupResources();
    //     }
    // }, [isUser, userALanguage, userBLanguage]); // Add dependencies

    const startListeningWithNoiseSuppressor = useCallback(async () => {
        try {
            const hasPermission = await checkMicrophonePermission();
            if (!hasPermission) {
                showToastInfo('Microphone permission denied', true);
                return;
            }
            setError(null);
            setRecordedText('');
            setIsListening(true);
            // DON'T destroy here - Voice is already initialized
            console.log('🎙️ Starting voice recognition...');
            await Voice.start("en-US");
            console.log('✅ Voice recognition started');
            showToastInfo('Listening...', false);

        } catch (error) {
            console.error('❌ Error starting voice recognition:', error);
            showToastInfo('Failed to start listening: ' + error.message, true);
            setError(error.message || 'Failed to start voice recognition');
            setIsListening(false);
        }
    }, []);

    // Move this outside of effects
    const onSpeechResults = (event) => {
        console.log('Speech results received:', event);
        showToastInfo('Processing speech results...', false);

        try {
            if (!event?.value?.[0]) {
                showToastInfo('No speech detected', true);
                return;
            }

            const text = event.value[0];
            if (text.trim() === '') {
                showToastInfo('Empty speech detected', true);
                return;
            }

            setRecordedText(text);
            setIsListening(false);
            showToastInfo('Adding message: ' + text.substring(0, 20) + '...', false);

            addMessage(text);
        } catch (error) {
            console.error('Speech recognition error:', error);
            showToastInfo('Error processing speech: ' + error.message, true);
            setError('Error processing speech results');
        }
    }

    const onSpeechEnd = async () => {
        try {
            showToastInfo('Speech ended', false);
            await cleanupResources()
            // stopRecorder();
        } catch (error) {
            showToastInfo('Error in speech end: ' + (error.message || error), true);
            console.error('Error in speech end:', error);
            Alert.alert('Error', 'Failed to properly end recording');
        }
    };

    const cleanupResources = async () => {
        showToastInfo("Cleaning resources", false);
        try {
            if (Voice.isRecognizing) {
                await Voice.stop();
            }
            await Voice.destroy();
            await NoiseSuppressor.release();
            // if (recorder) {
            //     recorder.stop((err) => {
            //         if (err) {
            //             console.error('Error stopping recorder:', err);
            //         }
            //         recorder = null;
            //     });
            // }
            setIsListening(false);
            setRecordedText('');
        } catch (error) {
            showToastInfo('Error cleaning up resources:', false);
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
                // Tts.speak(`Loudness enhancer enabled with gain ${gainValue} decibels`);
            }
            // else {
            //     await LoudnessEnhancer.release();
            //     setIsLoudnessEnabled(false);
            //     // Tts.speak("Loudness enhancer disabled");
            // }
        } catch (error) {
            console.error('Error with loudness enhancer:', error);
            showToastInfo('Error with loudness enhancer:', false);
            Alert.alert('Error', error.message || 'Failed to toggle loudness enhancer');
            setIsLoudnessEnabled(false);
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

    const getLanguageCode = (language) => {
        const codes = {
            'en': 'en-US',
            'hi': 'hi-IN',
            'mr': 'mr-IN',
            'te': 'te-IN'
        };
        return codes[language] || 'en-US';
    };

    const addMessage = useCallback((textOrObject) => {
        if (!apiKey) {
            // cosole.log("No API key available - showing modal");
            setModalVisible(true);
            return;
        }

        // Handle both string and object input
        const text = typeof textOrObject === 'string' ? textOrObject : textOrObject.text;
        if (text.trim() === "") return;

        setInputText("");
        const messageId = Date.now().toString();
        const newMessage = {
            id: messageId,
            isUser: isUser,
            text: text,
            ...(textOrObject?.emotion && { emotion: textOrObject.emotion })
        };

        setMessages(prev => [...prev, newMessage]);

        // Pass isUser to translation function
        dispatch(translateText(text, messageId, isUser, apiKey));

        setIsUser(prev => !prev);

        generateSmartresponse(newMessage);
    }, [isUser, apiKey, dispatch]);

    const generateSmartresponse = useCallback(async (newMessage) => {
        console.log('\n📨 === GENERATING SMART RESPONSES ===');
        console.log(`   API Key exists: ${!!apiKey}`);
        console.log(`   API Key length: ${apiKey?.length || 0}`);

        if (!apiKey) {
            console.log('❌ No API key available - showing modal');
            setModalVisible(true);
            return;
        }

        console.log(`   Current user: ${isUser ? 'User A' : 'User B'}`);
        console.log(`   Generate response in: ${isUser ? userBLanguage : userALanguage}`);

        try {
            setIsLoadingResponses(true);
            console.log('\n1️⃣ Initializing GoogleGenerativeAI...');
            const genAI = new GoogleGenerativeAI(apiKey);
            console.log('   ✅ GoogleGenerativeAI instance created');

            console.log('2️⃣ Getting model: gemini-2.0-flash');
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            console.log('   ✅ Model instance created');

            console.log('3️⃣ Formatting chat history...');
            const context = formatHistory([...messages, newMessage]);
            console.log(`   Context length: ${context.length} characters`);

            const prompt = `
            Here is the recent chat: ${context}

            Use only the context above for reference.  
            Do not address users as "UserA" or "UserB" — if needed, extract and use the actual names from the chat context.  

            Suggest exactly 3 natural-sounding replies in ${isUser ? getLanguageCode(userBLanguage) : getLanguageCode(userALanguage)} language that I could send next to continue the chat positively.  

            Guidelines for each reply:
            - Between 4 and 20 words long.
            - Warm, friendly, and polite — never blunt or curt.
            - Match the tone and formality of the conversation.
            - Avoid repeating questions or statements already in the context.
            - No emojis unless they are used in the recent messages.
            - Must be in ${isUser ? getLanguageCode(userBLanguage) : getLanguageCode(userALanguage)} language.

            Respond ONLY as a valid JSON array of 3 strings with no extra text, no markdown, and no explanations.
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
            console.log(`   ✅ Generated ${validResponses.length} smart responses`); console.log('\n✨ === SMART RESPONSE GENERATION COMPLETE === \n');
        } catch (error) {
            console.error('\n❌ === SMART RESPONSE GENERATION FAILED ===');
            console.error('Error:', error);
            console.error('Error type:', error.constructor.name);
            console.error('Error status:', error.status);
            console.error('Error message:', error.message);

            const errorMessage = (error.message || '').toLowerCase();
            const errorString = JSON.stringify(error).toLowerCase();

            console.log('\n🔍 Error classification:');
            if (errorMessage.includes('api') || errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.includes('unauthorized')) {
                console.log('   Classification: API KEY ERROR');
                showToastInfo('API key error - please verify your API key', true);
                setModalVisible(true);
            } else if (
                errorMessage.includes('not enabled') ||
                errorString.includes('not enabled') ||
                errorMessage.includes('disabled') ||
                error.status === 403
            ) {
                console.log('   Classification: API NOT ENABLED');
                showToastInfo('Generative AI API is not enabled. Please enable it in Google Cloud Console.', true);
                setModalVisible(true);
            } else if (errorMessage.includes('quota') || errorString.includes('quota') || error.status === 429) {
                console.log('   Classification: QUOTA EXCEEDED');
                showToastInfo('Gemini API quota exceeded. Please update API key or upgrade plan.', true);
            } else {
                console.log('   Classification: UNKNOWN ERROR');
                console.log(`   Error message: ${error.message}`);
                showToastInfo('Smart response generation error: ' + (error.message || 'Unknown error'), false);
            }
            setSmartResponses([]);
            console.log('\n === ERROR HANDLING COMPLETE === \n');
        } finally {
            setIsLoadingResponses(false);
        }
    }, [apiKey, messages, userALanguage, userBLanguage]);

    const formatHistory = (history) => {
        let res = "";
        history.forEach((item, index) => {
            res += `
             ${index % 2 === 0 ? "UserA" : "UserB"}: ${item.text}`;
        })
        return res;
    }

    useFocusEffect(useCallback(() => {
        const initializeApiKey = async () => {
            console.log('\n🔑 === INITIALIZING API KEY ON FOCUS ===');
            try {
                console.log('1️⃣ Retrieving saved API key from AsyncStorage...');
                const savedKey = await AsyncStorage.getItem('@gemini_api_key');
                if (savedKey) {
                    console.log(`   ✅ API key found! Length: ${savedKey.length}`);
                    console.log(`   Key preview: ${savedKey.substring(0, 10)}...${savedKey.substring(savedKey.length - 10)}`);
                    setApiKey(savedKey);
                    console.log('   ✅ API key set in state');
                } else {
                    console.log('❌ No saved API key found - showing modal');
                    setModalVisible(true);
                }
            } catch (error) {
                console.error('❌ Error loading API key on init:', error);
                showToastInfo('Error loading API key on init:', false);
                setModalVisible(true);
            }
            console.log('\n✨ === API KEY INITIALIZATION COMPLETE ===\n');
        };

        initializeApiKey();
    }, []));


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

                    if (!isLoudnessEnabled) {
                        await LoudnessEnhancer.initialize(0);
                        await LoudnessEnhancer.setGain(gainValue);
                        setIsLoudnessEnabled(true);
                    }

                    await new Promise(resolve => setTimeout(resolve, 500));
                    await initializeTts();
                    await Tts.speak(lastMessage.text);
                } catch (error) {
                    console.error('Error speaking message:', error);
                }
            };

            speakMessage();
        }
        return () => {
            Tts.stop();
        };
    }, [messages, isLoudnessEnabled, gainValue]));

    useFocusEffect(
        useCallback(() => {
            const initializeVoice = async () => {
                try {
                    console.log('🎙️ Initializing Voice...');

                    // Clean slate
                    await Voice.destroy();
                    Voice.removeAllListeners();

                    // Set up all event handlers
                    Voice.onSpeechStart = () => {
                        console.log('✅ Speech started');
                        showToastInfo('Speech started', false);
                        setIsListening(true);
                    };

                    Voice.onSpeechRecognized = () => {
                        console.log('✅ Speech recognized');
                        showToastInfo('Speech recognized', false);
                    };

                    Voice.onSpeechPartialResults = (e) => {
                        console.log('📝 Partial results:', e.value);
                        // Uncomment to see partial results:
                        // showToastInfo('Partial: ' + e.value?.[0], false);
                    };

                    Voice.onSpeechResults = onSpeechResults;
                    Voice.onSpeechEnd = onSpeechEnd;

                    Voice.onSpeechError = (e) => {
                        console.error('❌ Speech error:', e);
                        showToastInfo('Speech error: ' + (e.error?.message || 'Unknown error'), true);
                        setError(e.error?.message || 'Speech recognition error');
                        setIsListening(false);
                    };

                    Voice.onSpeechVolumeChanged = (e) => {
                        // Uncomment to debug volume detection:
                        // console.log('🔊 Volume:', e.value);
                    };

                    console.log('✅ Voice initialized successfully');

                } catch (error) {
                    console.error('❌ Error initializing Voice:', error);
                    showToastInfo('Error initializing Voice: ' + error.message, true);
                }
            };

            initializeVoice();

            return () => {
                const cleanup = async () => {
                    try {
                        console.log('🧹 Cleaning up Voice...');
                        if (Voice.isRecognizing) {
                            await Voice.stop();
                        }
                        await Voice.destroy();
                        Voice.removeAllListeners();
                    } catch (error) {
                        console.error('Cleanup error:', error);
                    }
                };
                cleanup();
            };
        }, [])
    );

    const toggleResponses = () => {
        setResponseOpen(prev => !prev);
        Animated.spring(rotateAnimation, {
            toValue: responseOpen ? 0 : 1,
            useNativeDriver: true,
            tension: 120,
            friction: 8
        }).start();
    };

    const validateApiKeyFormat = (key) => {
        // Google API keys typically start with 'AIza'
        console.log('🔍 Validating API key format...');
        console.log(`   Key length: ${key?.length}`);
        console.log(`   Key starts with AIza: ${key?.startsWith('AIza')}`);

        if (!key || key.length < 20) {
            console.log('❌ API key validation failed: Key too short');
            return { valid: false, message: 'API key is too short' };
        }
        if (!key.startsWith('AIza')) {
            console.log('❌ API key validation failed: Does not start with AIza');
            return { valid: false, message: 'API key should start with "AIza"' };
        }
        console.log('✅ API key format validation passed');
        return { valid: true, message: '' };
    };

    const saveApiKey = async (key) => {
        try {
            await AsyncStorage.setItem('@gemini_api_key', key);
            setApiKey(key);
            setApiKeyError(null);
            setModalVisible(false);
        } catch (error) {
            console.error('Error saving API key:', error);
            showToastInfo('Error saving API key:', false);
            setApiKeyError('Failed to save API key');
        }
    };



    const validateAndSaveKey = async () => {
        const trimmedKey = tempApiKey.trim();
        console.log('\n📝 === VALIDATING NEW API KEY === ');
        console.log(`   Key length: ${trimmedKey.length}`);
        console.log(`   Key preview: ${trimmedKey.substring(0, 10)}...${trimmedKey.substring(trimmedKey.length - 10)}`);

        if (!trimmedKey) {
            console.log('❌ Empty API key provided');
            setApiKeyError('API key cannot be empty');
            return;
        }

        // Validate API key format first
        console.log('\n1️⃣ Step 1: Validating API key format...');
        const formatValidation = validateApiKeyFormat(trimmedKey);
        if (!formatValidation.valid) {
            console.log(`❌ Format validation failed: ${formatValidation.message}`);
            setApiKeyError(formatValidation.message);
            return;
        }

        try {
            console.log('\n2️⃣ Step 2: Initializing GoogleGenerativeAI with key...');
            // Test with a minimal API call to validate the key
            const testAI = new GoogleGenerativeAI(trimmedKey);
            console.log('   ✅ GoogleGenerativeAI instance created');

            console.log('\n3️⃣ Step 3: Getting generative model (gemini-2.0-flash)...');
            const testModel = testAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            console.log('   ✅ Model instance created');

            console.log('\n4️⃣ Step 4: Testing API call with minimal prompt ("ping")...');
            const response = await testModel.generateContent('ping');
            console.log('   ✅ API call successful!');
            console.log(`   Response status: ${response.response?.status}`);
            console.log(`   Response text length: ${response.response?.text()?.length}`);

            console.log('\n5️⃣ Step 5: Saving API key to AsyncStorage...');
            await saveApiKey(trimmedKey);
            console.log('   ✅ API key saved successfully!');
            setTempApiKey('');
            console.log('\n✨ === API KEY VALIDATION COMPLETE === \n');
        } catch (error) {
            console.error('\n❌ === API KEY VALIDATION FAILED ===');
            console.error('Error object:', error);
            console.error('Error type:', error.constructor.name);
            console.error('Error status:', error.status);
            console.error('Error message:', error.message);
            console.error('Error details:', {
                name: error.name,
                statusText: error.statusText,
                response: error.response,
                cause: error.cause,
                fullJson: JSON.stringify(error, null, 2)
            });

            const errorMessage = (error.message || '').toLowerCase();
            const errorString = JSON.stringify(error).toLowerCase();

            console.log('\n🔍 Error classification:');
            // Handle specific error cases
            if (error.status === 401 || error.status === 403 || errorMessage.includes('invalid') || errorMessage.includes('unauthorized')) {
                console.log('   Classification: INVALID API KEY');
                showToastInfo('Invalid API key:', false);
                setApiKeyError('Invalid API key. Please check and try again.');
            } else if (errorMessage.includes('quota') || errorString.includes('quota') || error.status === 429) {
                console.log('   Classification: QUOTA EXCEEDED');
                showToastInfo('This API key has exceeded its quota. Please use a different key or upgrade plan.', true);
                setApiKeyError('API quota exceeded. Please use a different key.');
            } else if (
                errorMessage.includes('not enabled') ||
                errorMessage.includes('disabled') ||
                errorString.includes('not enabled') ||
                errorString.includes('generativeai') ||
                errorMessage.includes('permission denied') ||
                error.status === 403
            ) {
                console.log('   Classification: API NOT ENABLED');
                showToastInfo('API not enabled. Please enable the Generative AI API.', true);
                setApiKeyError('Google Generative AI API is not enabled for this project. Enable it at console.cloud.google.com');
            } else if (errorMessage.includes('not found') || errorString.includes('not found')) {
                console.log('   Classification: API KEY NOT FOUND');
                showToastInfo('API key not found or invalid project.', true);
                setApiKeyError('API key not found or invalid project. Please check your API key.');
            } else {
                console.log('   Classification: UNKNOWN ERROR');
                console.log(`   Error message will be shown: ${error.message}`);
                showToastInfo('Failed to validate API key:', false);
                setApiKeyError('Failed to validate API key. ' + (error.message || 'Unknown error'));
            }
            console.log('\n === ERROR HANDLING COMPLETE === \n');
        }
    };

    const renderMessageBubble = (message, index) => {
        const translation = translations[message.id];
        const isUserMessage = message.isUser;

        return (
            <View
                key={message.id}
                style={[
                    stylesChat.messageBubble,
                    isUserMessage ? stylesChat.userBubble : stylesChat.botBubble,
                ]}
            >
                <Text style={stylesChat.messageText}>{message.text}</Text>
                {translation && (
                    <View style={stylesChat.translationContainer}>
                        <Text style={stylesChat.translationLabel}>
                            {isUserMessage ? 'Translated to Partner\'s Language:' : 'Translated to Your Language:'}
                        </Text>
                        <Text style={stylesChat.translationText}>
                            {translation}
                        </Text>
                    </View>
                )}
                {message.emotion && (
                    <View style={stylesChat.emotionContainer}>
                        <Text style={stylesChat.emotionText}>
                            {message.emotion.emoji} {message.emotion.emotion}
                            ({Math.round(message.emotion.confidence * 100)}%)
                        </Text>
                    </View>
                )}
            </View>
        );
    };

    const generateChatSummary = async () => {
        if (!apiKey || messages.length === 0) return;

        try {
            setIsLoadingSummary(true);
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

            const chatHistory = formatHistory(messages);
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
            Alert.alert('Error', 'Failed to generate summary');
        } finally {
            setIsLoadingSummary(false);
        }
    };

    return (
        <LinearGradient
            colors={['rgb(1,114,178)', 'rgb(0,22,69)']}
            style={styles.container}
        >
            <View style={styles.mainContent}>
                <View style={styles.headerButtons}>
                    <TouchableOpacity
                        style={styles.settingsButton}
                        onPress={() => setModalVisible(true)}
                    >
                        <Icon name="cog" size={24} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.summaryButton}
                        onPress={generateChatSummary}
                        disabled={messages.length === 0 || isLoadingSummary}
                    >
                        <Icon name="file-text-o" size={24} color="#fff" />
                        {isLoadingSummary && <ActivityIndicator style={styles.summaryLoader} color="#fff" size="small" />}
                    </TouchableOpacity>
                </View>
                <ScrollView
                    ref={scrollViewRef}
                    contentContainerStyle={stylesChat.chatContainer}
                    onContentSizeChange={() => scrollViewRef.current.scrollToEnd({ animated: true })}
                >
                    {messages.map((message, index) => renderMessageBubble(message, index))}
                </ScrollView>

                <View style={styles.sliderContainer}>
                    <Slider
                        style={styles.slider}
                        minimumValue={0}
                        maximumValue={30}
                        step={1}
                        value={gainValue}
                        minimumTrackTintColor="#FFFFFF"
                        maximumTrackTintColor="rgba(255,255,255,0.3)"
                        thumbTintColor="#FFFFFF"
                        onValueChange={setGainValue}
                        onSlidingComplete={async (value) => {
                            if (isLoudnessEnabled) {
                                await LoudnessEnhancer.setGain(Math.round(value));
                            }
                        }}
                    />
                    <Text style={styles.sliderText}>
                        {Math.round(gainValue)}dB
                    </Text>
                </View>

                <View style={stylesChat.inputContainer}>
                    {smartResponses && (
                        <TouchableOpacity
                            onPress={toggleResponses}
                            style={stylesChat.toggleButton}
                        >
                            <Animated.View style={{
                                transform: [{
                                    rotate: rotateAnimation.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: ['0deg', '180deg']
                                    })
                                }]
                            }}>
                                <Icon
                                    name="chevron-up"
                                    size={20}
                                    color="rgb(1,114,178)"
                                />
                            </Animated.View>
                        </TouchableOpacity>
                    )}
                    {smartResponses && responseOpen && (
                        <>
                            {isLoadingResponses ? (
                                <View style={additionalStyles.loadingContainer}>
                                    <ActivityIndicator color="rgb(1,114,178)" />
                                    <Text style={additionalStyles.loadingText}>
                                        Generating responses...
                                    </Text>
                                </View>
                            ) : (
                                <View style={stylesChat.smartResponsesContainer}>
                                    {Array.isArray(smartResponses) && smartResponses.map((response) => (
                                        <TouchableOpacity
                                            key={nanoid()}
                                            style={stylesChat.smartResponseButton}
                                            onPress={() => addMessage(String(response))}
                                        >
                                            <Text style={stylesChat.smartResponseText}>
                                                {String(response)}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </>
                    )}
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity
                            style={stylesChat.micButton}
                            onPress={isListening ? onSpeechEnd : startListeningWithNoiseSuppressor}
                        >
                            <Text style={stylesChat.micButtonText}>
                                {isListening ?
                                    <Icon name="stop-circle" size={30} color="red" /> :
                                    <Icon name="microphone" size={30} color="#rgb(1,114,178)" />
                                }
                            </Text>
                        </TouchableOpacity>
                        <TextInput
                            style={stylesChat.input}
                            placeholder="Type a message..."
                            placeholderTextColor="rgb(1,114,178)"
                            value={inputText}
                            onChangeText={setInputText}
                        />
                        <TouchableOpacity
                            disabled={inputText.trim() === ""}
                            onPress={() => {
                                addMessage(inputText)
                                // anayzeAudio();
                            }}
                            style={stylesChat.sendButton}
                        >
                            <Text style={stylesChat.sendButtonText}>
                                <Icon name="send" size={25} color="#fff" />
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
            <Modal
                isVisible={isModalVisible}
                onBackdropPress={() => apiKey && setModalVisible(false)}
                onBackButtonPress={() => apiKey && setModalVisible(false)}
                backdropTransitionOutTiming={0}
                style={{ margin: 20 }}
            >
                <View style={modalStyles.modalContainer}>
                    <Text style={modalStyles.modalTitle}>
                        {apiKey ? 'Update API Key' : 'Enter Gemini API Key'}
                    </Text>
                    <Text style={modalStyles.modalDescription}>
                        Please enter your Gemini API key to enable chat functionality.
                        You can get one from Google AI Studio.
                    </Text>
                    <TextInput
                        style={modalStyles.modalInput}
                        placeholder="Enter API key"
                        value={tempApiKey}
                        onChangeText={setTempApiKey}
                        placeholderTextColor="rgba(0,0,0,0.5)"
                    />
                    {apiKeyError && (
                        <Text style={modalStyles.errorText}>{apiKeyError}</Text>
                    )}
                    <View style={modalStyles.buttonContainer}>
                        {apiKey && (
                            <TouchableOpacity
                                style={modalStyles.cancelButton}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={modalStyles.buttonText}>Cancel</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={modalStyles.saveButton}
                            onPress={validateAndSaveKey}
                        >
                            <Text style={modalStyles.buttonText}>
                                {apiKey ? 'Update' : 'Save'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal
                isVisible={isSummaryModalVisible}
                onBackdropPress={() => setSummaryModalVisible(false)}
                onBackButtonPress={() => setSummaryModalVisible(false)}
                backdropTransitionOutTiming={0}
                style={{ margin: 20 }}
            >
                <View style={modalStyles.summaryModalContainer}>
                    <Text style={modalStyles.summaryModalTitle}>Chat Summary</Text>
                    <ScrollView style={modalStyles.summaryScrollView}>
                        <Text style={modalStyles.summaryText}>{summaryText}</Text>
                    </ScrollView>
                    <TouchableOpacity
                        style={modalStyles.closeSummaryButton}
                        onPress={() => setSummaryModalVisible(false)}
                    >
                        <Text style={modalStyles.buttonText}>Close</Text>
                    </TouchableOpacity>
                </View>
            </Modal>

        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    mainContent: {
        flex: 1,
        position: 'relative',
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
    modal: {
        justifyContent: 'center',
        alignItems: 'center',
        margin: 0,
    },
    modalContainer: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 10,
        width: '80%',
        alignSelf: 'center',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        color: 'rgb(1,114,178)',
    },
    modalDescription: {
        fontSize: 14,
        marginBottom: 15,
        color: '#333',
        textAlign: 'center',
    },
    modalInput: {
        borderWidth: 1,
        borderColor: 'rgb(1,114,178)',
        borderRadius: 5,
        padding: 10,
        marginBottom: 10,
        fontSize: 16,
        width: '100%',
        color: '#000',
    },
    saveButton: {
        backgroundColor: 'rgb(1,114,178)',
        padding: 10,
        borderRadius: 5,
        alignItems: 'center',
        flex: 1,
        marginLeft: 5,
    },
    cancelButton: {
        backgroundColor: 'rgba(1,114,178,0.2)',
        padding: 10,
        borderRadius: 5,
        alignItems: 'center',
        flex: 1,
        marginRight: 5,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
        textAlign: 'center',
    },
    errorText: {
        color: 'red',
        fontSize: 14,
        marginBottom: 10,
        textAlign: 'center',
    },
    headerButtons: {
        flexDirection: 'row',
        position: 'absolute',
        top: 5,
        left: 5,
        zIndex: 1,
    },
    settingsButton: {
        backgroundColor: 'rgba(1,114,178,0.8)',
        borderRadius: 50,
        padding: 10,
        elevation: 5,
        margin: 5,
    },
    summaryButton: {
        backgroundColor: 'rgba(1,114,178,0.8)',
        borderRadius: 50,
        padding: 10,
        elevation: 5,
        margin: 5,
        flexDirection: 'row',
        alignItems: 'center',
    },
    summaryLoader: {
        marginLeft: 5,
    },
});

const stylesChat = StyleSheet.create({
    container: {
        flex: 1,
    },

    chatContainer: {
        padding: 10,
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
    micButtonText: {
        fontSize: 20,
    },
    sendButton: {
        padding: 10,
        backgroundColor: 'rgb(1,114,178)',
        borderRadius: 20,
    },
    sendButtonText: {
        color: '#fff',
        fontWeight: 'bold',
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
    settingsButton: {
        position: 'absolute',
        top: 0,
        left: 5,
        backgroundColor: 'rgba(1,114,178,0.8)',
        borderRadius: 50,
        padding: 10,
        elevation: 5,
        margin: 5,
    },
    emotionContainer: {
        marginTop: 5,
        paddingTop: 5,
        borderTopWidth: 1,
        borderTopColor: 'rgba(1,114,178,0.2)',
    },
    emotionText: {
        fontSize: 12,
        color: 'rgb(1,114,178)',
        fontStyle: 'italic',
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

const additionalStyles = StyleSheet.create({
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
    }
});

const modalStyles = StyleSheet.create({
    modalContainer: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'rgb(1,114,178)',
        marginBottom: 15,
        textAlign: 'center',
    },
    modalDescription: {
        color: '#666',
        marginBottom: 20,
    },
    modalInput: {
        borderWidth: 1,
        borderColor: 'rgb(1,114,178)',
        borderRadius: 8,
        padding: 10,
        marginBottom: 10,
        color: '#000',
    },
    errorText: {
        color: 'red',
        marginBottom: 10,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
    },
    saveButton: {
        backgroundColor: 'rgb(1,114,178)',
        padding: 10,
        borderRadius: 8,
        minWidth: 80,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#666',
        padding: 10,
        borderRadius: 8,
        minWidth: 80,
        alignItems: 'center',
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
});


export default A2AScreen;