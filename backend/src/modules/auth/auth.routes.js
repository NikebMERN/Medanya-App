const express = require("express");
const router = express.Router();
const { otpLimiter } = require("../../middlewares/rateLimit.middleware");
const { verifyOtpAndLogin } = require("./auth.controller");
const { validateVerifyOtp } = require("./auth.validation");

router.post(
    "/verify-otp",
    otpLimiter,
    validateVerifyOtp,
    verifyOtpAndLogin
);

module.exports = router;
