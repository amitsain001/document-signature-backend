const mongoose = require("mongoose");

const signatureSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
    },
    signer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    pageNumber: {
      type: Number,
      required: true,
    },
    x: {
      type: Number,
      required: true,
    },
    y: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Signed"],
      default: "Pending",
    },
    text: {
        type: String,
    },

    font: {
        type: String,
    },

  },
  { timestamps: true }
);

module.exports = mongoose.model("Signature", signatureSchema);