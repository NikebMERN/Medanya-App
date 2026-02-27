// src/services/sms.service.js - Optional Twilio SMS for delivery codes
function isConfigured() {
    return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER);
}

async function sendDeliveryCode(phoneNumber, code) {
    if (!isConfigured()) return { sent: false, reason: "Twilio not configured" };
    try {
        const client = require("twilio")(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        const from = process.env.TWILIO_PHONE_NUMBER;
        const to = String(phoneNumber || "").trim();
        if (!to) return { sent: false, reason: "No phone number" };
        const formatted = to.startsWith("+") ? to : `+${to}`;
        await client.messages.create({
            body: `Your Medanya delivery code is: ${code}. Give this to the seller when you receive your item.`,
            from,
            to: formatted,
        });
        return { sent: true };
    } catch (e) {
        return { sent: false, reason: e.message };
    }
}

module.exports = { isConfigured, sendDeliveryCode };
