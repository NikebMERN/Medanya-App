const mongoose = require("mongoose");

const missingSchema = new mongoose.Schema({
    fullName: String,
    photo: String,
    voiceNote: String,
    lastLocation: { lat: Number, lng: Number },
    phone: String,
    comments: [
        {
            userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            comment: String,
            createdAt: { type: Date, default: Date.now },
        },
    ],
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("MissingPerson", missingSchema);
