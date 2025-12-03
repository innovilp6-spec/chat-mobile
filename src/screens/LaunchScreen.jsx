// Install required packages:
// npm install react-native-device-info @react-native-async-storage/async-storage crypto-js

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';
import LinearGradient from 'react-native-linear-gradient';
import Clipboard from '@react-native-clipboard/clipboard';

const LaunchScreen = ({ navigation }) => {
    const [licenseKey, setLicenseKey] = useState('');
    const [isLicensed, setIsLicensed] = useState(false);
    const [deviceInfo, setDeviceInfo] = useState('');
    const [expiryDate, setExpiryDate] = useState(null);

    // This should be more secure in production - consider using keychain
    const ENCRYPTION_KEY = 'your-secret-key-here-make-it-complex';
    const LICENSE_STORAGE_KEY = 'app_license_data';

    useEffect(() => {
        checkExistingLicense();
    }, []);

    const generateDeviceFingerprint = async () => {
        try {
            const deviceId = await DeviceInfo.getUniqueId();
            const brand = await DeviceInfo.getBrand();
            const model = await DeviceInfo.getModel();

            // Combine multiple device identifiers for better uniqueness
            const fingerprint = `${deviceId}_${brand}_${model}`;
            return fingerprint;
        } catch (error) {
            console.error('Error generating device fingerprint:', error);
            return 'unknown_device';
        }
    };

    const generateInitialLicenseRequest = async () => {
        try {
            const deviceFingerprint = await generateDeviceFingerprint();
            const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

            const licenseData = {
                deviceId: deviceFingerprint,
                requestDate: currentDate,
                status: 'pending'
            };

            const encryptedData = CryptoJS.AES.encrypt(
                JSON.stringify(licenseData),
                ENCRYPTION_KEY
            ).toString();

            setDeviceInfo(encryptedData);

            Alert.alert(
                'License Request Generated',
                `Please send this encrypted data to the development team via email:\n\n${encryptedData}`,
                [
                    { text: 'Copy to Clipboard', onPress: () => copyToClipboard(encryptedData) },
                    { text: 'OK' }
                ]
            );
        } catch (error) {
            Alert.alert('Error', 'Failed to generate license request');
        }
    };

    const copyToClipboard = (text) => {
        // You'll need to install @react-native-clipboard/clipboard for this
        Clipboard.setString(text);
        console.log('Copy to clipboard:', text);
    };

    const validateAndStoreLicense = async (encryptedLicense) => {
        try {
            const decryptedBytes = CryptoJS.AES.decrypt(encryptedLicense, ENCRYPTION_KEY);
            const decryptedData = JSON.parse(decryptedBytes.toString(CryptoJS.enc.Utf8));

            const currentDeviceFingerprint = await generateDeviceFingerprint();

            // Validate device ID matches
            if (decryptedData.deviceId !== currentDeviceFingerprint) {
                throw new Error('License is not valid for this device');
            }

            // Validate expiry date

            let expiryDate;
            if (decryptedData.expiryDate)
            expiryDate = new Date(decryptedData.expiryDate);

            const currentDate = new Date();

            console.log(currentDate, expiryDate);

            if(expiryDate===undefined){
                throw new Error("Invalid license key");
            }

            if (currentDate > expiryDate) {
                throw new Error('License has expired');
            }

            // Store license data
            await AsyncStorage.setItem(LICENSE_STORAGE_KEY, encryptedLicense);

            setIsLicensed(true);
            setExpiryDate(expiryDate);

            navigation.replace("Home");

            // Alert.alert(
            //     'License Activated',
            //     `License valid until: ${expiryDate.toDateString()}`
            // );

        } catch (error) {
            Alert.alert('Invalid License', error.message || 'The license key is invalid');
        }
    };

    const checkExistingLicense = async () => {
        try {
            const storedLicense = await AsyncStorage.getItem(LICENSE_STORAGE_KEY);
            if (storedLicense) {
                const decryptedBytes = CryptoJS.AES.decrypt(storedLicense, ENCRYPTION_KEY);
                const decryptedData = JSON.parse(decryptedBytes.toString(CryptoJS.enc.Utf8));

                const expiryDate = new Date(decryptedData.expiryDate);
                const currentDate = new Date();

                if (currentDate <= expiryDate) {
                    setIsLicensed(true);
                    setExpiryDate(expiryDate);
                    navigation.replace('Home');
                } else {
                    // License expired
                    await AsyncStorage.removeItem(LICENSE_STORAGE_KEY);
                    Alert.alert('License Expired', 'Please request a new license');
                }
            }
        } catch (error) {
            console.error('Error checking existing license:', error);
        }
    };

    const clearLicense = async () => {
        await AsyncStorage.removeItem(LICENSE_STORAGE_KEY);
        setIsLicensed(false);
        setExpiryDate(null);
    };

    if (isLicensed) {
        return (
            <LinearGradient colors={['rgb(1,114,178)', 'rgb(0,22,69)']} style={styles.container}>
                <View style={styles.content}>
                    <View style={styles.logoContainer}>
                        <Text style={styles.title}>App Licensed</Text>
                        <Text style={styles.info}>
                            License valid until: {expiryDate?.toDateString()}
                        </Text>
                    </View>

                    {/* Dev button with gradient */}
                    <TouchableOpacity
                        style={styles.button}
                        onPress={clearLicense}
                    >
                        <LinearGradient
                            colors={['#4facfe', 'rgb(1,114,178)']}
                            style={styles.gradientButton}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Text style={styles.buttonText}>Clear License (Dev)</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </LinearGradient>
        );
    }

    return (
        <LinearGradient colors={['rgb(1,114,178)', 'rgb(0,22,69)']} style={styles.container}>
            <View style={styles.content}>
                <View style={styles.logoContainer}>
                    <Text style={styles.title}>License Required</Text>
                </View>

                <TouchableOpacity
                    style={styles.button}
                    onPress={generateInitialLicenseRequest}
                >
                    <LinearGradient
                        colors={['#4facfe', 'rgb(1,114,178)']}
                        style={styles.gradientButton}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <Text style={styles.buttonText}>Generate License Request</Text>
                    </LinearGradient>
                </TouchableOpacity>

                <Text style={styles.label}>Enter License Key:</Text>
                <TextInput
                    style={styles.input}
                    value={licenseKey}
                    onChangeText={setLicenseKey}
                    placeholder="Paste your license key here"
                    placeholderTextColor="#rgba(255,255,255,0.7)"
                    multiline
                />

                <TouchableOpacity
                    style={[styles.button, !licenseKey.trim() && styles.buttonDisabled]}
                    onPress={() => validateAndStoreLicense(licenseKey)}
                    disabled={!licenseKey.trim()}
                >
                    <LinearGradient
                        colors={['#4facfe', 'rgb(1,114,178)']}
                        style={styles.gradientButton}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <Text style={styles.buttonText}>Activate License</Text>
                    </LinearGradient>
                </TouchableOpacity>

                {deviceInfo && (
                    <View style={styles.deviceInfoContainer}>
                        <Text style={styles.label}>Your Device Request:</Text>
                        <Text style={styles.deviceInfo}>{deviceInfo}</Text>
                        <TouchableOpacity
                            style={[styles.button, styles.copyButton]}
                            onPress={() => copyToClipboard(deviceInfo)}
                        >
                            <LinearGradient
                                colors={['#4facfe', 'rgb(1,114,178)']}
                                style={styles.gradientButton}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                <Text style={styles.buttonText}>Copy Request Key</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
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
    logoContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 10,
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
    },
    label: {
        fontSize: 18,
        marginTop: 20,
        marginBottom: 10,
        color: '#fff',
        fontWeight: '600',
        alignSelf: 'flex-start',
    },
    input: {
        borderWidth: 1,
        borderColor: '#fff',
        padding: 15,
        borderRadius: 10,
        minHeight: 100,
        textAlignVertical: 'top',
        width: '100%',
        color: '#fff',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        marginBottom: 20,
    },
    info: {
        fontSize: 16,
        color: '#fff',
        textAlign: 'center',
        marginBottom: 20,
    },
    deviceInfoContainer: {
        marginTop: 20,
        padding: 15,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 10,
        width: '100%',
    },
    deviceInfo: {
        fontSize: 12,
        fontFamily: 'monospace',
        color: '#fff',
        marginBottom: 10,
    },
    button: {
        width: '100%',
        height: 50,
        borderRadius: 25,
        overflow: 'hidden',
        marginVertical: 10,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    gradientButton: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
    },
    copyButton: {
        marginTop: 10,
    }
});

export default LaunchScreen;