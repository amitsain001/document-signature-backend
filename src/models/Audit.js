const mongoose = require("mongoose");

const auditSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
    },
    signerEmail: String,
    ipAddress: String,
    action: {
      type: String,
      enum: ["SIGNED", "REQUESTED", "VIEWED" , "REJECTED"],
      required: true,
    },
    tokenUsed: String,
  },
  { timestamps: true } // automatically adds createdAt
);

module.exports = mongoose.model("Audit", auditSchema);