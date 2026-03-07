const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { createSignature, getDocumentSignatures } = require("../controllers/signatureController");

router.post("/", protect, createSignature);
router.get("/:documentId", protect, getDocumentSignatures);

router.delete("/:id", async (req, res) => {
    try {

        const { id } = req.params;
        const deletedSignature = await SignatureModel.findByIdAndDelete(id);
        if (!deletedSignature) {
            return res.status(404).json({ message: "Signature not found" });
        }
        res.json({ message: "Signature deleted successfully" });

    } catch (error) {
        console.error("Delete signature error:", error);
        res.status(500).json({ message: "Server error while deleting signature" });
    }
});

module.exports = router;