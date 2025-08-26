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
    Platform
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
// import { v4 as uuidv4 } from "uuid";
import AsyncStorage from '@react-native-async-storage/async-storage';
import Modal from 'react-native-modal';
import RNFS from "react-native-fs";
import { sERPrompt } from "../utils/prompts";
import { Audio } from 'react-native-compressor';
import { Recorder } from '@react-native-community/audio-toolkit';
import { showToastInfo } from '../utils/toasts';
import { nanoid } from 'nanoid';
const API_KEY2 = "AIzaSyCmyRnnYcyZnc-JW4vmuJX9LjSqwpH4iPM";
const API_KEY = "AIzaSyAHC8t6u8D7i - apswYjwiHc - Ho3zSfMxa0";

const OPTIMAL_CONFIG = {
    model: "gemini-1.5-flash",
    compression: {
        maxFileSize: 200, // KB
        bitrate: 64,
        sampleRate: 22050
    },
    rateLimit: {
        requestsPerMinute: 12,
        delayBetweenRequests: 5000
    }
};

let recorder;

const F2FScreen = () => {
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
    const [isUser, setIsUser] = useState(true);
    const [messages, setMessages] = useState([]);
    const [responseOpen, setResponseOpen] = useState(true);
    const [rotateAnimation] = useState(new Animated.Value(1));
    // API wali states
    const [apiKey, setApiKey] = useState(null);
    const [isModalVisible, setModalVisible] = useState(false);
    const [tempApiKey, setTempApiKey] = useState('');
    const [apiKeyError, setApiKeyError] = useState(null);
    const [filePath, setFilePath] = useState("");
    const startListeningWithNoiseSuppressor = async () => {
        try {
            setError(null);
            setRecordedText('');
            setIsListening(true);

            const isVoiceAvailable = await Voice.isAvailable();
            if (!isVoiceAvailable) {
                throw new Error('Voice recognition is not available on this device');
            }

            const noiseSuppressorInitialized = await NoiseSuppressor.initialize(0);
            if (!noiseSuppressorInitialized) {
                throw new Error('Failed to initialize noise suppressor');
            }

            await NoiseSuppressor.setEnabled(true);

            Voice.onSpeechResults = onSpeechResults;
            Voice.onSpeechEnd = onSpeechEnd;
            // Voice.onSpeechError = onSpeechError;

            await Voice.start('en-US');
            startRecorder();
        } catch (error) {
            console.error('Error in noise suppressor:', error);
            setError(error.message || 'An error occurred while starting the noise suppressor');
            setIsListening(false);
            await cleanupResources();
            Alert.alert('Error', error.message || 'An error occurred while starting the noise suppressor');
        }
    };

    const startRecorder = () => {
        try {
            recorder = new Recorder("recording.wav", {
                bitrate: 256000,
                channels: 1,
                sampleRate: 16000,
                format: "wav",
                encoder: "pcm"
            });

            recorder.prepare((err, fsPath) => {
                if (err) {
                    showToastInfo("Recorder prepare error: " + err, true);
                    console.error("Recorder prepare error:", err);
                } else {
                    setFilePath(fsPath);
                    recorder.record();
                    showToastInfo("Recording started", false);
                    console.log("📂 Saving to:", fsPath);
                }
            });

        } catch (err) {
            showToastInfo("Error while recording: " + err, true);
            throw new Error(`Error while recording: ${err}`);
        }
    }

    const stopRecorder = () => {
        try {
            if (recorder) {
                recorder.stop((err) => {
                    if (err) {
                        showToastInfo("Stop recorder error: " + err, true);
                        console.error("Stop recorder error:", err);
                    } else {
                        showToastInfo("Recording stopped", false);
                        console.log("✅ Saved:", filePath);
                    }
                });
            }
        } catch (err) {
            showToastInfo("Error while stopping recording: " + err, true);
            throw new Error(`Error while recording: ${err}`);
        }
    }

    // First modify onSpeechResults to analyze emotion
    const onSpeechResults = async (event) => {
        try {
            const text = event.value[0];
            setRecordedText(text);
            setIsListening(false);

            showToastInfo('Speech recognized', false);

            // First analyze the emotion
            const emotionAnalysis = await anayzeAudio();

            // Create new message with emotion data
            const enrichedText = {
                text: text,
                emotion: emotionAnalysis
            };

            // Use addMessage to handle the state update and smart response generation
            addMessage(enrichedText);

        } catch (error) {
            showToastInfo('Error processing speech: ' + (error.message || error), true);
            setError('Error processing speech results');
            Alert.alert('Error', 'Failed to process speech results');
        }
    };

    const onSpeechEnd = async () => {
        try {
            showToastInfo('Speech ended', false);
            await cleanupResources()
            stopRecorder();
        } catch (error) {
            showToastInfo('Error in speech end: ' + (error.message || error), true);
            console.error('Error in speech end:', error);
            Alert.alert('Error', 'Failed to properly end recording');
        }
    };

    const cleanupResources = async () => {
        try {
            if (Voice.isRecognizing) {
                await Voice.stop();

            }
            await NoiseSuppressor.release();
            setIsListening(false);
        } catch (error) {
            console.error('Error cleaning up resources:', error);
            throw error;
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
        }
    };

    const addMessage = useCallback((textOrObject) => {
        if (!apiKey) {
            console.log("No API key available - showing modal");
            setModalVisible(true);
            return;
        }

        // Handle both string and object input
        const text = typeof textOrObject === 'string' ? textOrObject : textOrObject.text;
        if (text.trim() === "") return;

        setInputText("");
        const newMessage = {
            id: messages.length + 1,
            isUser: isUser,
            text: text,
            ...(textOrObject?.emotion && { emotion: textOrObject.emotion })
        };

        setMessages(prev => [...prev, newMessage]);
        setIsUser(prev => !prev);
        generateSmartresponse(newMessage);
    }, [isUser, apiKey]);

    const generateSmartresponse = useCallback(async (newMessage) => {
        if (!apiKey) {
            console.log("null apikey", apiKey)
            setModalVisible(true);
            return;
        }

        try {
            setIsLoadingResponses(true);
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite-preview-06-17" });
            const context = formatHistory([...messages, newMessage]);
            const prompt = `
            Here is the recent chat: ${context}

            Use only the context above for reference.  
            Do not address users as "UserA" or "UserB" — if needed, extract and use the actual names from the chat context.  
            "UserA" and "UserB" are placeholders for the code.  

            Suggest exactly 3 natural-sounding replies I could send next to continue the chat positively.  

            Guidelines for each reply:
            - Between 4 and 20 words long.
            - Warm, friendly, and polite — never blunt or curt.
            - Match the tone and formality of the conversation.
            - Avoid repeating questions or statements already in the context.
            - No emojis unless they are used in the recent messages.

            Respond ONLY as a valid JSON array of 3 strings with no extra text, no markdown, and no explanations.
            `;
            const res = await model.generateContent(prompt);
            const result = res.response.text()
                .replace(/```json/i, "")
                .replace(/```/g, "")
                .trim();

            // Ensure we're working with an array of strings
            const parsedResponse = JSON.parse(result);
            const validResponses = parsedResponse.map(item =>
                // Handle both string and object responses
                typeof item === 'string' ? item : item.reply || String(item)
            );

            console.log(validResponses);
            setSmartResponses(validResponses);
        } catch (error) {
            console.error('Smart` response generation error:', error);
            if (error.message.includes('API key')) {
                console.log("API key error in generation")
                setModalVisible(true);
            }
            setSmartResponses([]);
        } finally {
            setIsLoadingResponses(false);
        }
    }, [apiKey]);

    const formatHistory = (history) => {
        let res = "";
        history.forEach((item, index) => {
            res += `
             ${index % 2 === 0 ? "UserA" : "UserB"}: ${item.text}`;
        })
        return res;
    }

    // const audioFile = require('../assets/sad-hindi-song-piano-ambience-383331.mp3');

    // const copyAudioFile = async () => {
    //     try {
    //         const exists = await RNFS.exists(destinationAudioPath);
    //         if (!exists) {
    //             // Get the absolute path to the source file
    //             const absolutePath = RNFS.MainBundlePath + '/' + sourceAudioPath;
    //             console.log('Copying from:', absolutePath);
    //             console.log('Copying to:', destinationAudioPath);

    //             await RNFS.copyFile(absolutePath, destinationAudioPath);
    //             console.log('Audio file copied successfully');
    //         } else {
    //             console.log('Audio file already exists in destination');
    //         }
    //     } catch (error) {
    //         console.error('Error copying audio file:', error);
    //     }
    // };

    const getFileSize = async (filePath) => {
        const stat = await RNFS.stat(filePath);
        return stat.size / 1024; // Convert to KB
    };

    const anayzeAudio = async () => {
        try {
            if (!filePath) {
                showToastInfo('No recorded audio file found', true);
                throw new Error('No recorded audio file found');
            }
            showToastInfo('Analyzing audio...', false);

            console.log('Reading recorded audio from:', filePath);

            // Create temp path for processing
            const tempPath = `${RNFS.CachesDirectoryPath}/temp_audio_${Date.now()}.mp3`;

            // Read the recorded audio file
            const rawAudioData = await RNFS.readFile(filePath, 'base64');
            if (!rawAudioData) {
                showToastInfo('Could not read recorded audio file', true);
                throw new Error('Could not read recorded audio file');
            }

            // Write to temp file for compression
            await RNFS.writeFile(tempPath, rawAudioData, 'base64');
            showToastInfo('Compressing audio...', false);

            // Compress the audio
            console.log('Compressing recorded audio...');
            const compressedPath = await Audio.compress(tempPath, {
                bitrate: OPTIMAL_CONFIG.compression.bitrate * 1000,
                samplerate: OPTIMAL_CONFIG.compression.sampleRate,
                quality: 'medium',
            });

            // Check compressed file size
            const fileSize = await getFileSize(compressedPath);
            console.log('Compressed file size:', fileSize, 'KB');

            // Read the compressed file
            const compressedAudioData = await RNFS.readFile(compressedPath, 'base64');

            // Clean up temporary files
            await RNFS.unlink(tempPath);
            await RNFS.unlink(compressedPath);
            await RNFS.unlink(filePath); // Clean up original recording

            if (!apiKey) {
                showToastInfo('API key not found', true);
                throw new Error('API key not found');
            }

            showToastInfo('Sending audio for emotion analysis...', false);

            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: OPTIMAL_CONFIG.model });

            // Add rate limiting delay
            await new Promise(resolve => setTimeout(resolve, OPTIMAL_CONFIG.rateLimit.delayBetweenRequests));

            const res = await model.generateContent([
                sERPrompt,
                {
                    inlineData: {
                        data: compressedAudioData,
                        mimeType: "audio/wav"
                    }
                }
            ]);

            const result = res.response.text()
                .replace(/```json/i, "")
                .replace(/```/g, "")
                .trim();

            const parsedResponse = JSON.parse(result);
            console.log('Analysis result:', parsedResponse);

            showToastInfo(
                `Emotion: ${parsedResponse.emoji} ${parsedResponse.emotion} (${Math.round(parsedResponse.confidence * 100)}%)`,
                false
            );

            // Clear the filePath state after successful analysis
            setFilePath("");

            return parsedResponse;

        } catch (error) {
            showToastInfo("Emotion analysis error: " + (error.message || error), true);
            console.error("Error while analysing the audio: ", error);
            // Clean up files even if there's an error
            try {
                if (filePath) await RNFS.unlink(filePath);
                setFilePath("");
            } catch (cleanupError) {
                console.error("Error during cleanup:", cleanupError);
            }
            return { emotion: "neutral", emoji: "😐", confidence: 0.5 };
        }
    }


    useFocusEffect(useCallback(() => {

        Voice.onSpeechResults = onSpeechResults;
        Voice.onSpeechEnd = onSpeechEnd;
        // Voice.onSpeechError = onSpeechError;
        toggleLoudnessEnhancer();


        return () => {
            try {
                cleanupResources();
                Voice.removeAllListeners();
            } catch (error) {
                console.error('Error cleaning up on unmount:', error);
            }
        };
    }, [isUser]));

    useFocusEffect(useCallback(() => {
        const initializeApiKey = async () => {
            try {
                const savedKey = await AsyncStorage.getItem('@gemini_api_key');
                if (savedKey) {
                    console.log("Loaded API key on init:", savedKey);
                    setApiKey(savedKey);
                } else {
                    console.log("No saved key found on init");
                    setModalVisible(true);
                }
            } catch (error) {
                console.error('Error loading API key on init:', error);
                setModalVisible(true);
            }
        };

        initializeApiKey();
    }, []));

    useFocusEffect(useCallback(() => {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && messages.length % 2 === 0) {
            const speakMessage = async () => {
                try {
                    // Make sure loudness enhancer is enabled
                    if (!isLoudnessEnabled) {
                        await LoudnessEnhancer.initialize(0);
                        await LoudnessEnhancer.setGain(gainValue);
                        setIsLoudnessEnabled(true);
                    }

                    // Short delay to ensure loudness enhancer is active
                    await new Promise(resolve => setTimeout(resolve, 500));

                    // Initialize TTS and speak the message
                    await initializeTts();
                    await Tts.speak(lastMessage.text);
                } catch (error) {
                    console.error('Error speaking message:', error);
                    Alert.alert('Error', 'Failed to speak message');
                }
            };

            speakMessage();
        }
        return () => {
            Tts.stop();
        };
    }, [messages]));

    const toggleResponses = () => {
        setResponseOpen(prev => !prev);
        Animated.spring(rotateAnimation, {
            toValue: responseOpen ? 0 : 1,
            useNativeDriver: true,
            tension: 120,
            friction: 8
        }).start();
    };

    const saveApiKey = async (key) => {
        try {
            await AsyncStorage.setItem('@gemini_api_key', key);
            setApiKey(key);
            setApiKeyError(null);
            setModalVisible(false);
        } catch (error) {
            console.error('Error saving API key:', error);
            setApiKeyError('Failed to save API key');
        }
    };

    const loadApiKey = async () => {
        try {
            const savedKey = await AsyncStorage.getItem('@gemini_api_key');
            if (savedKey) {
                console.log("saved key: ", savedKey);
                setApiKey(savedKey);
            } else {
                console.log("no saved key")
                setModalVisible(true);
            }
        } catch (error) {
            console.error('Error loading API key:', error);
            console.log("error in loading key")
            setModalVisible(true);
        }
    };

    const validateAndSaveKey = async () => {
        if (!tempApiKey.trim()) {
            setApiKeyError('API key cannot be empty');
            return;
        }

        try {
            // Test the API key with a simple request
            const testAI = new GoogleGenerativeAI(tempApiKey);
            const testModel = testAI.getGenerativeModel({ model: "gemini-2.5-flash-lite-preview-06-17" });
            await testModel.generateContent('test');

            await saveApiKey(tempApiKey);
            setTempApiKey('');
        } catch (error) {
            console.error('Invalid API key:', error);
            setApiKeyError('Invalid API key. Please check and try again.');
        }
    };

    // Update the renderMessageBubble function
    const renderMessageBubble = (message, index) => {
        return (
            <View
                key={message.id}
                style={[
                    stylesChat.messageBubble,
                    index % 2 === 0 ? stylesChat.userBubble : stylesChat.botBubble,
                ]}
            >
                <Text style={stylesChat.messageText}>{message.text}</Text>
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
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite-preview-06-17" });

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
            <View style={styles.sliderContainer}>
                <Text style={styles.sliderText}>
                    {Math.round(gainValue)}dB
                </Text>
                <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={30}
                    step={1}
                    value={gainValue}
                    minimumTrackTintColor="#FFFFFF"
                    maximumTrackTintColor="#000000"
                    thumbTintColor="#FFFFFF"
                    onValueChange={setGainValue}
                    onSlidingComplete={async (value) => {
                        if (isLoudnessEnabled) {
                            await LoudnessEnhancer.setGain(Math.round(value));
                        }
                    }}
                />

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
    content: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    button: {
        width: '80%',
        height: 80,
        borderRadius: 20,
        alignItems: 'end',
        justifyContent: "start",
        marginVertical: 10,
        borderColor: '#FFFFFF',
        borderWidth: 2,
    },
    buttonListening: {
        backgroundColor: 'rgba(255,0,0,0.3)',
    },
    buttonEnabled: {
        backgroundColor: 'rgba(0,255,0,0.3)',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: 'bold',
    },
    sliderContainer: {
        width: '80%',
        marginTop: 20,
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "center",
        position: "absolute",
        top: "15%",
        right: "-33%",
        transform: [{ rotate: "270deg" }],
    },
    sliderText: {
        color: '#FFFFFF',
        fontSize: 20,
        transform: [{ rotate: "90deg" }]
    },
    slider: {
        width: '70%',
        height: 40,
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
    }
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


export default F2FScreen;