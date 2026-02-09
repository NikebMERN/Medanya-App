/**
 * Firebase Phone Auth via Identity Toolkit REST API.
 * Sends SMS via Firebase and verifies the code; uses FIREBASE_WEB_API_KEY.
 */
const logger = require("../../utils/logger.util");

const BASE_URL = "https://identitytoolkit.googleapis.com/v1/accounts";

function getApiKey() {
    const key = process.env.FIREBASE_WEB_API_KEY;
    if (!key) {
        throw new Error("FIREBASE_WEB_API_KEY is required for Firebase Phone Auth (use Web API Key from Firebase Console > Project Settings)");
    }
    return key;
}

/**
 * Ask Firebase to send an SMS verification code to the phone.
 * @param {string} phoneNumber - E.164, e.g. "+971521234567"
 * @param {string} recaptchaToken - From client (reCAPTCHA / App Check / SafetyNet)
 * @returns {Promise<{ sessionInfo: string }>}
 */
async function sendVerificationCode(phoneNumber, recaptchaToken) {
    const apiKey = getApiKey();
    const e164 = phoneNumber.startsWith("+") ? phoneNumber : `+${phoneNumber}`;

    const res = await fetch(`${BASE_URL}:sendVerificationCode?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            phoneNumber: e164,
            recaptchaToken: recaptchaToken || undefined,
        }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        const msg = data.error?.message || data.message || res.statusText;
        logger.error("[Firebase Phone] sendVerificationCode failed:", msg);
        const err = new Error(msg || "Failed to send verification code");
        err.code = data.error?.code || "FIREBASE_PHONE_ERROR";
        err.status = res.status;
        throw err;
    }

    if (!data.sessionInfo) {
        throw new Error("Firebase did not return sessionInfo");
    }

    return { sessionInfo: data.sessionInfo };
}

/**
 * Verify the SMS code and sign in with phone number; returns Firebase idToken and phone.
 * @param {string} sessionInfo - From sendVerificationCode response
 * @param {string} code - 6-digit code from SMS
 * @returns {Promise<{ idToken: string, phoneNumber: string }>}
 */
async function signInWithPhoneNumber(sessionInfo, code) {
    const apiKey = getApiKey();

    const res = await fetch(`${BASE_URL}:signInWithPhoneNumber?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            sessionInfo,
            code: String(code).trim(),
        }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        const msg = data.error?.message || data.message || res.statusText;
        logger.error("[Firebase Phone] signInWithPhoneNumber failed:", msg);
        const err = new Error(msg || "Invalid or expired code");
        err.code = data.error?.code || "INVALID_OTP";
        err.status = 400;
        throw err;
    }

    const idToken = data.idToken;
    const phoneNumber = data.phoneNumber || data.temporaryProof?.phoneNumber;

    if (!idToken) {
        throw new Error("Firebase did not return idToken");
    }

    return { idToken, phoneNumber };
}

module.exports = {
    sendVerificationCode,
    signInWithPhoneNumber,
};
