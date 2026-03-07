const Signature = require("../models/Signature");

// Save signature placeholder
exports.createSignature = async (req, res) => {
  try {
    const { documentId, pageNumber, x, y, text, font } = req.body;

    const signature = await Signature.create({
        documentId,
        signer: req.user._id,
        pageNumber,
        x,
        y,
        text,
        font,
    });

    res.status(201).json({
        message: "Signature placeholder created",
        signature,
    });
  } catch (error) {
        res.status(500).json({ message: error.message });
  }
};

// fetching signature from document 
exports.getDocumentSignatures = async (req, res) => {
  try {
    const signatures = await Signature.find({
      documentId: req.params.documentId,
    });

    res.json(signatures);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};