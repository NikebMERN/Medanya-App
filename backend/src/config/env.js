// src/config/env.js
const { z } = require("zod");
const dotenv = require("dotenv");

dotenv.config();

const envSchema = z.object({
    PORT: z.string().default("4000"),
    NODE_ENV: z.enum(["development", "production"]).default("development"),

    MONGO_URI: z.string().min(1),

    MYSQL_HOST: z.string().min(1),
    MYSQL_PORT: z.string().regex(/^\d+$/),
    MYSQL_USER: z.string().min(1),
    MYSQL_PASSWORD: z.string().optional().default(""),
    MYSQL_DB: z.string().min(1),

    // Redis is optional (your health already shows redis false sometimes)
    REDIS_HOST: z.string().optional().default("127.0.0.1"),
    REDIS_PORT: z.string().regex(/^\d+$/).optional().default("6379"),
    REDIS_PASSWORD: z.string().optional(),

    // ✅ Firebase Admin (FCM)
    FIREBASE_PROJECT_ID: z.string().min(1),
    FIREBASE_CLIENT_EMAIL: z.string().min(1),
    FIREBASE_PRIVATE_KEY: z.string().min(1),

    // optional topic
    FCM_DEFAULT_TOPIC: z.string().optional().default("medanya_all"),

    JWT_SECRET: z.string().min(1, "JWT_SECRET is required for auth"),

    FIREBASE_WEB_API_KEY: z.string().optional(),

    EMERGENCY_PHONE: z.string().optional(),
    EMERGENCY_LABEL: z.string().optional().default("Direct Community Liaison Line"),

    CLOUDINARY_CLOUD_NAME: z.string().optional(),
    CLOUDINARY_API_KEY: z.string().optional(),
    CLOUDINARY_API_SECRET: z.string().optional(),

    // Admin panel / dev: comma-separated phone numbers (E.164 digits) that can use fixed OTP in development
    ADMIN_TEST_PHONES: z.string().optional(),
    ADMIN_TEST_OTP_CODE: z.string().optional().default("123456"),
});

const env = envSchema.parse(process.env);

module.exports = env;
