import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import LinearGradient from "react-native-linear-gradient";
import { Picker } from '@react-native-picker/picker';
import { useDispatch, useSelector } from 'react-redux';
import { setUserALanguage, setUserBLanguage } from '../store/slices/translationSlice';

const LANGUAGES = [
    { label: 'English', value: 'en' },
    { label: 'Hindi', value: 'hi' },
    { label: 'Marathi', value: 'mr' },
    { label: 'Telugu', value: 'te' }
];

export default function HomeScreen({ navigation }) {
    const dispatch = useDispatch();
    const userALanguage = useSelector(state => state.translation.userALanguage);
    const userBLanguage = useSelector(state => state.translation.userBLanguage);

    return (
        <LinearGradient
            colors={['rgb(1,114,178)', 'rgb(0,22,69)']}
            style={styles.container}
        >
            <View style={styles.content}>
                {/* Logo Section */}
                <View style={styles.logoContainer}>
                    <Image
                        style={styles.logo}
                        source={{
                            uri: 'https://cdn-icons-png.flaticon.com/512/6171/6171939.png'
                        }}
                        accessibilityLabel="TCS CommBridge Logo - Connecting through communication"
                    />
                    <Text style={styles.appName}>TCS CommBridge</Text>
                    <Text style={styles.tagline}>Breaking barriers, building connections</Text>
                </View>

                <View style={styles.languageSelectors}>
                    <View style={styles.languageSelector}>
                        <Text style={styles.languageLabel}>Your Language (User A)</Text>
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={userALanguage}
                                onValueChange={(value) => dispatch(setUserALanguage(value))}
                                style={styles.picker}
                                dropdownIconColor="#fff"
                                accessibilityLabel="User A language selection"
                            >
                                {LANGUAGES.map(lang => (
                                    <Picker.Item
                                        key={`A-${lang.value}`}
                                        label={lang.label}
                                        value={lang.value}
                                        style={styles.pickerItem}
                                    />
                                ))}
                            </Picker>
                        </View>
                    </View>

                    <View style={styles.languageSelector}>
                        <Text style={styles.languageLabel}>Partner's Language (User B)</Text>
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={userBLanguage}
                                onValueChange={(value) => dispatch(setUserBLanguage(value))}
                                style={styles.picker}
                                dropdownIconColor="#fff"
                                accessibilityLabel="User B language selection"
                            >
                                {LANGUAGES.map(lang => (
                                    <Picker.Item
                                        key={`B-${lang.value}`}
                                        label={lang.label}
                                        value={lang.value}
                                        style={styles.pickerItem}
                                    />
                                ))}
                            </Picker>
                        </View>
                    </View>
                </View>

                {/* Chat Button */}
                <TouchableOpacity
                    style={styles.chatButton}
                    onPress={() => navigation.navigate("A2A")}
                    accessibilityLabel="Start in-person chat"
                    accessibilityHint="Opens the face to face conversation screen"
                >
                    <LinearGradient
                        colors={['#4facfe', 'rgb(1,114,178)']}
                        style={styles.gradientButton}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <Text style={styles.buttonText}>Start Conversation</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        padding: 20,
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    logoContainer: {
        alignItems: 'center',
        marginTop: 40,
    },
    logo: {
        width: 120,
        height: 120,
        marginBottom: 20,
    },
    appName: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 10,
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
    },
    tagline: {
        fontSize: 16,
        color: '#fff',
        opacity: 0.9,
        fontStyle: 'italic',
    },
    languageSelectors: {
        width: '90%',
        maxWidth: 400,
        gap: 20,
    },
    languageSelector: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 15,
        padding: 20,
    },
    languageLabel: {
        color: '#fff',
        fontSize: 18,
        marginBottom: 10,
        textAlign: 'center',
        fontWeight: '600',
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#fff',
        borderRadius: 10,
        overflow: 'hidden',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    picker: {
        color: '#fff',
        height: 50,
    },
    pickerItem: {
        fontSize: 16,
        color: '#000',
    },
    chatButton: {
        width: '90%',
        maxWidth: 400,
        height: 60,
        marginBottom: 40,
        borderRadius: 30,
        overflow: 'hidden',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    gradientButton: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
    }
});