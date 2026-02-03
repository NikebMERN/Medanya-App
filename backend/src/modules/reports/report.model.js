import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
    {
        reporterId: {
            type: String, // MySQL user ID
            index: true,
        },

        isAnonymous: {
            type: Boolean,
            default: false,
        },

        reportedPhone: {
            type: String,
            index: true,
        },

        reportedName: {
            type: String,
            trim: true,
        },

        reasons: [
            {
                type: String,
                enum: [
                    "unpaid_salary",
                    "fraud",
                    "physical_abuse",
                    "sexual_harassment",
                    "passport_confiscation",
                    "threats",
                    "other",
                ],
            },
        ],

        description: {
            type: String,
            maxlength: 1000,
        },

        evidence: [
            {
                type: {
                    type: String,
                    enum: ["image", "video", "audio"],
                },
                url: String,
            },
        ],

        location: {
            lat: Number,
            lng: Number,
            accuracy: Number,
        },

        riskLevel: {
            type: String,
            enum: ["warning", "dangerous"],
            default: "warning",
        },

        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
            index: true,
        },

        reviewedBy: {
            type: String, // admin/moderator ID
        },

        reviewedAt: {
            type: Date,
        },

        falseReportScore: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

export default mongoose.model("Report", reportSchema);
