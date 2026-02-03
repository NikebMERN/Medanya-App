import mongoose from "mongoose";

const severeAbuseSchema = new mongoose.Schema(
    {
        isAnonymous: {
            type: Boolean,
            default: true,
        },

        description: {
            type: String,
            required: true,
            maxlength: 2000,
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
        },

        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
        },

        reviewedBy: {
            type: String,
        },

        reviewedAt: {
            type: Date,
        },
    },
    { timestamps: true }
);

export default mongoose.model("SevereAbuse", severeAbuseSchema);
