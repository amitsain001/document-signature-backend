const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
    {
        originalName: {
            type: String,
            required: true,
        },
        filePath: {
            type: String,
            required: true,
        },
        fileSize: {
            type: Number,
            required: true,
        },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        signatureToken: String,
        tokenExpiresAt: Date,
        signerEmail: String,
        isCompleted: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Document", documentSchema);