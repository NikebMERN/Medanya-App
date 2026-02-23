const express = require("express");
const router = express.Router();
const { otpLimiter, otpSendLimiter } = require("../../middlewares/rateLimit.middleware");
const { verifyOtpAndLogin, sendOtpHandler, verifyOtpAndLoginServer, guestLogin } = require("./auth.controller");
const { validateVerifyOtp, validateSendOtp, validateVerifyOtpServer } = require("./auth.validation");

router.post("/guest", guestLogin);
router.post("/otp/send", otpSendLimiter, validateSendOtp, sendOtpHandler);
router.post("/otp/verify", otpLimiter, validateVerifyOtpServer, verifyOtpAndLoginServer);

router.post(
    "/verify-otp",
    otpLimiter,
    validateVerifyOtp,
    verifyOtpAndLogin
);

module.exports = router;
