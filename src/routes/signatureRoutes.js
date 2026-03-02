const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { createSignature, getDocumentSignatures } = require("../controllers/signatureController");

router.post("/", protect, createSignature);
router.get("/:documentId", protect, getDocumentSignatures);

module.exports = router;