// src/modules/missingPersons/missing.model.js
const mongoose = require("mongoose");

const GPSchema = new mongoose.Schema(
    { lat: Number, lng: Number },
    { _id: false },
);

const MissingPersonSchema = new mongoose.Schema(
    {
        createdBy: { type: String, required: true, index: true },

        photoUrl: { type: String, required: true },
        fullName: { type: String, default: "" },

        contactPhone: { type: String, required: true },
        voiceUrl: { type: String, default: "" },

        lastKnownLocationText: { type: String, required: true },
        gps: { type: GPSchema, default: null },

        description: { type: String, required: true },

        status: {
            type: String,
            enum: ["active", "found", "closed", "pending_review"],
            default: "active",
            index: true,
        },
    },
    { timestamps: true },
);

// Indexes for feed/listing
MissingPersonSchema.index({ status: 1, createdAt: -1 });
MissingPersonSchema.index({ createdBy: 1, createdAt: -1 });

// Simple search helpers
MissingPersonSchema.index({ fullName: 1 });
MissingPersonSchema.index({ lastKnownLocationText: 1 });

module.exports = mongoose.model("MissingPerson", MissingPersonSchema);
