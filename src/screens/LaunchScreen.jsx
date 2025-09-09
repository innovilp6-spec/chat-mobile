// Install required packages:
// npm install react-native-device-info @react-native-async-storage/async-storage crypto-js

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';

const LaunchScreen = () => {
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
        // Clipboard.setString(text);
        // cosole.log('Copy to clipboard:', text);
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
            const expiryDate = new Date(decryptedData.expiryDate);
            const currentDate = new Date();

            if (currentDate > expiryDate) {
                throw new Error('License has expired');
            }

            // Store license data
            await AsyncStorage.setItem(LICENSE_STORAGE_KEY, encryptedLicense);

            setIsLicensed(true);
            setExpiryDate(expiryDate);

            Alert.alert(
                'License Activated',
                `License valid until: ${expiryDate.toDateString()}`
            );

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
            <View style={styles.container}>
                <Text style={styles.title}>App Licensed</Text>
                <Text style={styles.info}>
                    License valid until: {expiryDate?.toDateString()}
                </Text>
                <Button title="Clear License (Dev)" onPress={clearLicense} />

                {/* Your main app content goes here */}
                <Text style={styles.content}>
                    🎉 Welcome to the licensed application!
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>License Required</Text>

            <Button
                title="Generate License Request"
                onPress={generateInitialLicenseRequest}
            />

            <Text style={styles.label}>Enter License Key:</Text>
            <TextInput
                style={styles.input}
                value={licenseKey}
                onChangeText={setLicenseKey}
                placeholder="Paste your license key here"
                multiline
            />

            <Button
                title="Activate License"
                onPress={() => validateAndStoreLicense(licenseKey)}
                disabled={!licenseKey.trim()}
            />

            {deviceInfo && (
                <View style={styles.deviceInfoContainer}>
                    <Text style={styles.label}>Your Device Request:</Text>
                    <Text style={styles.deviceInfo}>{deviceInfo}</Text>
                </View>
            )}
        </View>
    );
};

// Dev team license generation utility (for server-side or dev tools)
const generateLicenseForDevice = (deviceId, expiryDate) => {
    const ENCRYPTION_KEY = 'your-secret-key-here-make-it-complex'; // Same as in app

    const licenseData = {
        deviceId: deviceId,
        expiryDate: expiryDate, // Format: YYYY-MM-DD
        issuedDate: new Date().toISOString().split('T')[0],
        status: 'active'
    };

    const encryptedLicense = CryptoJS.AES.encrypt(
        JSON.stringify(licenseData),
        ENCRYPTION_KEY
    ).toString();

    return encryptedLicense;
};

// Example usage for dev team:
// const license = generateLicenseForDevice('device123_Samsung_Galaxy', '2024-12-31');
// // cosole.log('Generated license:', license);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        marginTop: 20,
        marginBottom: 10,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        borderRadius: 5,
        minHeight: 100,
        textAlignVertical: 'top',
    },
    info: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 20,
    },
    content: {
        fontSize: 18,
        textAlign: 'center',
        marginTop: 30,
    },
    deviceInfoContainer: {
        marginTop: 20,
        padding: 10,
        backgroundColor: '#f0f0f0',
        borderRadius: 5,
    },
    deviceInfo: {
        fontSize: 12,
        fontFamily: 'monospace',
    },
});

export default LaunchScreen;