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