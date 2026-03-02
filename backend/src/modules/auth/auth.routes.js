const express = require("express");
const router = express.Router();
const auth = require("../../middlewares/auth.middleware");
const { otpLimiter, otpSendLimiter } = require("../../middlewares/rateLimit.middleware");
const { verifyOtpAndLogin, sendOtpHandler, verifyOtpAndLoginServer, guestLogin, linkFirebaseHandler } = require("./auth.controller");
const { validateVerifyOtp, validateSendOtp, validateVerifyOtpServer } = require("./auth.validation");
const {
    googleRedirect,
    googleCallback,
    facebookRedirect,
    facebookCallback,
} = require("./oauth.controller");

// Browser-based OAuth (optional fallback)
router.get("/oauth/google", googleRedirect);
router.get("/oauth/google/callback", googleCallback);
router.get("/oauth/facebook", facebookRedirect);
router.get("/oauth/facebook/callback", facebookCallback);

router.post("/guest", guestLogin);
router.post("/firebase", otpLimiter, validateVerifyOtp, verifyOtpAndLogin);
router.post("/link/firebase", auth, otpLimiter, validateVerifyOtp, linkFirebaseHandler);
router.post("/otp/send", otpSendLimiter, validateSendOtp, sendOtpHandler);
router.post("/otp/verify", otpLimiter, validateVerifyOtpServer, verifyOtpAndLoginServer);

router.post(
    "/verify-otp",
    otpLimiter,
    validateVerifyOtp,
    verifyOtpAndLogin
);

module.exports = router;
