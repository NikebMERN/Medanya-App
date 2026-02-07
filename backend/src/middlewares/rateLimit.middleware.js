const rateLimit = require("express-rate-limit");

const otpLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 5,
    message: "Too many OTP attempts. Try again later.",
});

const otpSendLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 5,
    message: "Too many OTP send requests. Try again later.",
});

module.exports = { otpLimiter, otpSendLimiter };
