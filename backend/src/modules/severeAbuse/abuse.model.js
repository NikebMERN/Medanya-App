// src/modules/severeAbuse/abuse.model.js
const mongoose = require("mongoose");

const AbuseSchema = new mongoose.Schema(
    {
        // reporterId is nullable when anonymous=true
        reporterId: { type: String, default: null, index: true },
        anonymous: { type: Boolean, default: false, index: true },

        accusedPhoneNumber: { type: String, default: "" },
        accusedName: { type: String, default: "" },

        gps: {
            lat: { type: Number },
            lng: { type: Number },
        },

        category: {
            type: String,
            enum: ["physical_abuse", "sexual_harassment", "trafficking", "forced_labor", "other"],
            required: true,
            index: true,
        },

        description: { type: String, required: true },

        evidenceUrls: {
            photos: { type: [String], default: [] },
            videos: { type: [String], default: [] },
            voice: { type: [String], default: [] },
        },

        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
            index: true,
        },

        contentWarning: { type: String, default: "" },
        legalDisclaimerAccepted: { type: Boolean, required: true },
    },
    { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

// fast admin queries + public feeds
AbuseSchema.index({ status: 1, createdAt: -1 });
AbuseSchema.index({ category: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("SevereAbuse", AbuseSchema);
