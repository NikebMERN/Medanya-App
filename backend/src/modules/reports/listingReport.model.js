// src/modules/reports/listingReport.model.js
const mongoose = require("mongoose");

const ListingReportSchema = new mongoose.Schema(
    {
        targetType: {
            type: String,
            enum: ["job", "marketplace", "user"],
            required: true,
            index: true,
        },
        targetId: { type: String, required: true, index: true },
        reporterId: { type: String, required: true, index: true },
        reason: { type: String, default: "" },
        description: { type: String, default: "" },
        mediaUrls: { type: [String], default: [] },
    },
    { timestamps: true },
);

ListingReportSchema.index({ targetType: 1, targetId: 1, reporterId: 1 });
ListingReportSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
ListingReportSchema.index({ reporterId: 1, createdAt: -1 });

module.exports = mongoose.model("ListingReport", ListingReportSchema);
