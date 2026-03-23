const crypto = require("crypto");
const Document = require("../models/Document");

// Upload document
exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const signatureToken = crypto.randomBytes(32).toString("hex");

    const document = await Document.create({
        originalName: req.file.originalname,
        filePath: req.file.path,
        fileSize: req.file.size,
        uploadedBy: req.user._id,
        signatureToken,
        status: "PENDING"
    });

    res.status(201).json({
      message: "Document uploaded successfully",
      document,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get logged-in user's documents
exports.getMyDocuments = async (req, res) => {
  try {
    const documents = await Document.find({
      uploadedBy: req.user._id,
    }).sort({ createdAt: -1 });

    res.json(documents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getDocumentById = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    res.json(document);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getDocumentByToken = async (req, res) => {
    try {
          const document = await Document.findOne({
          signatureToken: req.params.token,
        });

        if (!document) {
          return res.status(404).json({ message: "Document not found" });
        }

        res.json(document);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
};

exports.rejectDocument = async (req, res) => {
    try {

        const document = await Document.findOne({
            signatureToken: req.params.token
        });

        if (!document) {
            return res.status(404).json({ message: "Document not found" });
        }

        document.status = "REJECTED";
        document.rejectionReason = req.body.reason;

        await document.save();

        res.json({ message: "Document rejected" });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.signDocument = async (req, res) => {
    try {

        const document = await Document.findOne({
            signatureToken: req.params.token
        });

        if (!document) {
            return res.status(404).json({ message: "Document not found" });
        }

        document.status = "SIGNED";
        await document.save();
        res.json({ message: "Document signed successfully" });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.finalizeDocument = async (req, res) => {
    try {
        const doc = await Document.findById(req.params.id);

        if (!doc) {
            return res.status(404).json({ message: "Document not found" });
        }

        doc.status = "SIGNED";
        await doc.save();
        res.json({ message: "Document signed successfully", doc });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
