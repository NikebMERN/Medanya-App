/**
 * Scam AI: OpenAI provider.
 * Uses small/cheap model with strict JSON output.
 * Requires AI_PROVIDER=openai and OPENAI_API_KEY.
 */
const { z } = require("zod");
const { filterValidLabels } = require("./scamAI.types");
const logger = require("../../utils/logger.util");

const AIOutputSchema = z.object({
    scamProbability: z.number().min(0).max(1),
    confidence: z.number().min(0).max(1),
    labels: z.array(z.string()).max(10),
    explanation: z.string().max(160),
});

const name = "openai";

async function classify(content, targetType = "JOB") {
    if (!content || (!content.title && !content.description)) {
        return { scamProbability: 0, confidence: 0.5, labels: [], explanation: "No content" };
    }

    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.AI_MODEL || "gpt-4o-mini";

    if (!apiKey) {
        throw new Error("OPENAI_API_KEY not set");
    }

    const text = [content.title || "", content.description || "", content.location || ""]
        .filter(Boolean)
        .join("\n")
        .slice(0, 2000);

    const systemPrompt = `You are a scam detector for job and marketplace listings. Analyze the text and return a JSON object with:
- scamProbability: number 0.0-1.0 (how likely it is a scam)
- confidence: number 0.0-1.0
- labels: array of strings from this exact set only: UPFRONT_PAYMENT, DEPOSIT_REQUIRED, PASSPORT_REQUEST, OFF_PLATFORM_CONTACT, WIRE_TRANSFER, CRYPTO_PAYMENT, TOO_GOOD_TO_BE_TRUE, JOB_SCAM_PATTERN, MARKET_SCAM_PATTERN, SUSPICIOUS_LANGUAGE, PERSONAL_DATA_REQUEST
- explanation: string max 160 chars

Return ONLY valid JSON, no markdown or extra text.`;

    const userPrompt = `Target type: ${targetType}\n\nText to analyze:\n${text}`;

    const controller = new AbortController();
    const timeout = parseInt(process.env.SCAM_AI_SYNC_TIMEOUT_MS, 10) || 1500;
    const id = setTimeout(() => controller.abort(), timeout);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            max_tokens: 200,
            temperature: 0.1,
        }),
        signal: controller.signal,
    });

    clearTimeout(id);

    if (!response.ok) {
        const errBody = await response.text().catch(() => "");
        logger.warn("scamAI.openai: API error", response.status, errBody.slice(0, 200));
        throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim() || "";
    const jsonStr = raw.replace(/^```json?\s*|\s*```$/g, "");
    let parsed;
    try {
        parsed = JSON.parse(jsonStr);
    } catch (e) {
        logger.warn("scamAI.openai: invalid JSON", raw.slice(0, 100));
        throw new Error("Invalid AI response JSON");
    }

    const validated = AIOutputSchema.safeParse(parsed);
    if (!validated.success) {
        logger.warn("scamAI.openai: schema validation failed", validated.error.message);
        throw new Error("AI output schema validation failed");
    }

    const v = validated.data;
    return {
        scamProbability: Math.round(v.scamProbability * 100) / 100,
        confidence: Math.round(v.confidence * 100) / 100,
        labels: filterValidLabels(v.labels),
        explanation: (v.explanation || "").slice(0, 160),
    };
}

module.exports = { name, classify };
