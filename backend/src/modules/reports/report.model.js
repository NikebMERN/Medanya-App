// src/modules/reports/report.model.js
const mongoose = require("mongoose");

const GPSchema = new mongoose.Schema(
    { lat: Number, lng: Number },
    { _id: false },
);

const EvidenceSchema = new mongoose.Schema(
    {
        photos: { type: [String], default: [] }, // URLs only
        videos: { type: [String], default: [] }, // URLs only
    },
    { _id: false },
);

const ReportSchema = new mongoose.Schema(
    {
        // Who submitted
        reporterId: { type: String, required: true, index: true },

        // Who is being reported (employer/scammer)
        phoneNumber: { type: String, required: true, index: true },
        employerName: { type: String, default: "" },

        locationText: { type: String, default: "" },
        gps: { type: GPSchema, default: null },

        reason: {
            type: String,
            enum: [
                "unpaid_salary",
                "fraud_scam",
                "physical_abuse",
                "sexual_harassment",
                "passport_confiscation",
                "other",
            ],
            required: true,
            index: true,
        },

        description: { type: String, default: "" },

        evidence: {
            type: EvidenceSchema,
            default: () => ({ photos: [], videos: [] }),
        },

        // Moderation workflow
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "approved",
            index: true,
        },

        // Computed at create-time (and can be recomputed on demand)
        riskLevel: {
            type: String,
            enum: ["warning", "dangerous"],
            default: "warning",
            index: true,
        },

        // OPTIONAL hook for future “reported content” (video/post)
        // Not used in this stage, but allows reuse later.
        targetType: {
            type: String,
            enum: ["employer", "content"],
            default: "employer",
            index: true,
        },
        targetRef: { type: String, default: "" }, // e.g. videoId in stage-7
    },
    { timestamps: true },
);

// Fast queries for blacklist summary + latest reports
ReportSchema.index({ phoneNumber: 1, createdAt: -1 });

// Anti-spam: reporter+phone recent lookup
ReportSchema.index({ reporterId: 1, phoneNumber: 1, createdAt: -1 });

// Admin filters
ReportSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Report", ReportSchema);
