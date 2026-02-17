import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, SafeAreaView } from 'react-native';
import LinearGradient from "react-native-linear-gradient";
import { Picker } from '@react-native-picker/picker';
import { useDispatch, useSelector } from 'react-redux';
import { setUserALanguage, setUserBLanguage } from '../store/slices/translationSlice';

/**
 * List of languages supported for the initial selection.
 */
const LANGUAGES = [
    { label: 'English', value: 'en' },
    { label: 'Hindi', value: 'hi' },
    { label: 'Marathi', value: 'mr' },
    { label: 'Bengali', value: 'bn' },
    { label: 'Gujarati', value: 'gu' },
    { label: 'Tamil', value: 'ta' },
    { label: 'Telugu', value: 'te' }
];

/**
 * HomeScreen Component.
 * Acts as the entry point for the application, allowing users to select
 * their languages and choose a conversation mode.
 */
export default function HomeScreen({ navigation }) {
    const dispatch = useDispatch();

    // Select current language preferences from the Redux store
    const userALanguage = useSelector(state => state.translation.userALanguage);
    const userBLanguage = useSelector(state => state.translation.userBLanguage);

    return (
        <LinearGradient
            colors={['rgb(1,114,178)', 'rgb(0,22,69)']}
            style={styles.container}
        >
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.content}>
                    {/* Brand Section */}
                    <View style={styles.logoContainer}>
                        <Image
                            style={styles.logo}
                            source={{
                                uri: 'https://cdn-icons-png.flaticon.com/512/6171/6171939.png'
                            }}
                            accessibilityLabel="TCS Sankara Logo"
                        />
                        <Text style={styles.appName}>TCS Sankara</Text>
                        <Text style={styles.tagline}>Breaking barriers, building connections</Text>
                    </View>

                    {/* Language Selection Section */}
                    <View style={styles.languageSelectors}>
                        <View style={styles.languageSelector}>
                            <Text style={styles.languageLabel}>My Language</Text>
                            <View style={styles.pickerContainer}>
                                <Picker
                                    selectedValue={userALanguage}
                                    onValueChange={(value) => dispatch(setUserALanguage(value))}
                                    style={styles.picker}
                                    dropdownIconColor="#fff"
                                >
                                    {LANGUAGES.map(lang => (
                                        <Picker.Item
                                            key={`A-${lang.value}`}
                                            label={lang.label}
                                            value={lang.value}
                                        />
                                    ))}
                                </Picker>
                            </View>
                        </View>

                        <View style={styles.languageSelector}>
                            <Text style={styles.languageLabel}>Partner's Language</Text>
                            <View style={styles.pickerContainer}>
                                <Picker
                                    selectedValue={userBLanguage}
                                    onValueChange={(value) => dispatch(setUserBLanguage(value))}
                                    style={styles.picker}
                                    dropdownIconColor="#fff"
                                >
                                    {LANGUAGES.map(lang => (
                                        <Picker.Item
                                            key={`B-${lang.value}`}
                                            label={lang.label}
                                            value={lang.value}
                                        />
                                    ))}
                                </Picker>
                            </View>
                        </View>
                    </View>

                    {/* Action Buttons Section */}
                    <View style={styles.buttonGroup}>
                        <TouchableOpacity
                            style={styles.mainButton}
                            onPress={() => navigation.navigate("A2A")}
                        >
                            <Text style={styles.buttonText}>Start A2A Chat</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.mainButton, styles.secondaryButton]}
                            onPress={() => navigation.navigate("F2F")}
                        >
                            <Text style={styles.buttonText}>Start F2F Mode</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    content: {
        flex: 1,
        padding: 24,
        justifyContent: 'space-between',
    },
    logoContainer: {
        alignItems: 'center',
        marginTop: 40,
    },
    logo: {
        width: 100,
        height: 100,
        marginBottom: 16,
    },
    appName: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
    },
    tagline: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.7)',
        marginTop: 4,
    },
    languageSelectors: {
        gap: 24,
    },
    languageSelector: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        padding: 16,
    },
    languageLabel: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    pickerContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    picker: {
        color: '#fff',
    },
    buttonGroup: {
        gap: 12,
        marginBottom: 20,
    },
    mainButton: {
        backgroundColor: '#4facfe',
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#4facfe',
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});