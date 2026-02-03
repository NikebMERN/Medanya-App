// src/config/env.js
const { z } = require("zod");
const dotenv = require("dotenv");

dotenv.config();

const envSchema = z.object({
    PORT: z.string().default("4000"),
    NODE_ENV: z.enum(["development", "production"]),
    MONGO_URI: z.string().min(1),
    MYSQL_HOST: z.string().min(1),
    MYSQL_PORT: z.string().regex(/^\d+$/),
    MYSQL_USER: z.string().min(1),
    MYSQL_PASSWORD: z.string(),
    MYSQL_DB: z.string().min(1),
    REDIS_HOST: z.string().min(1),
    REDIS_PORT: z.string().regex(/^\d+$/),
    REDIS_PASSWORD: z.string().optional(),
});

const env = envSchema.parse(process.env);

module.exports = env;
