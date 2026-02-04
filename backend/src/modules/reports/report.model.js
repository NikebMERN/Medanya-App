const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema({
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    phone: String,
    name: String,
    reasons: [String],
    evidence: [String],
    location: { lat: Number, lng: Number },
    riskLevel: {
        type: String,
        enum: ["warning", "dangerous"],
        default: "warning",
    },
    status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
    },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Report", reportSchema);
