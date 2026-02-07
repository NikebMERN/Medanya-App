// src/modules/missingPersons/missingComment.model.js
const mongoose = require("mongoose");

const MissingPersonCommentSchema = new mongoose.Schema(
    {
        missingPersonId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "MissingPerson",
            required: true,
            index: true,
        },
        authorId: { type: String, required: true, index: true },
        text: { type: String, default: "", maxlength: 1000 },
        voiceUrl: { type: String, default: null, maxlength: 600 },
    },
    { timestamps: true }
);

MissingPersonCommentSchema.index({ missingPersonId: 1, createdAt: 1 });

module.exports = mongoose.model("MissingPersonComment", MissingPersonCommentSchema);
