const { z } = require("zod");

const verifyOtpSchema = z.object({
    idToken: z.string().min(10),
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
};
