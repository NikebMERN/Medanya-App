const { z } = require("zod");

const verifyOtpSchema = z.object({
    idToken: z.string().min(10),
});

const sendOtpSchema = z.object({
    phone: z.string().min(9, "Phone number required"),
    recaptchaToken: z.string().optional(),
    sessionInfo: z.string().optional(),
});

const verifyOtpServerSchema = z.object({
    phone: z.string().min(9, "Phone number required"),
    code: z.string().length(6, "Code must be 6 digits"),
});

const validate = (schema) => (req, res, next) => {
    try {
        schema.parse(req.body);
        next();
    } catch (err) {
        return res.status(400).json({
            message: "Invalid request",
            errors: err.errors,
        });
    }
};

module.exports = {
    validateVerifyOtp: validate(verifyOtpSchema),
    validateSendOtp: validate(sendOtpSchema),
    validateVerifyOtpServer: validate(verifyOtpServerSchema),
};
