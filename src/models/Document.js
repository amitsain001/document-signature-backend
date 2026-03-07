const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
    {
        originalName: {
            type: String,
            required: true,
        },

        filePath: String,
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
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

        status: {
            type: String,
            enum: ["PENDING", "SIGNED", "REJECTED"],
            default: "PENDING"
        },

        rejectionReason: {
            type: String,
            default: null
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Document", documentSchema);