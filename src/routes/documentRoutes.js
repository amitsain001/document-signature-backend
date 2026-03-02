const express = require("express");
const router = express.Router();
const upload = require("../middleware/uploadMiddleware");
const protect = require("../middleware/authMiddleware");
const { uploadDocument, getMyDocuments, getDocumentById } = require("../controllers/documentController");
const fs = require("fs");
const path = require("path");
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const DocumentModel = require("../models/Document");
const SignatureModel = require("../models/Signature");

router.post("/upload", protect, upload.single("file"), uploadDocument);
router.get("/my-docs", protect, getMyDocuments);
router.get("/:id", protect, getDocumentById);

router.post("/:id/finalize", async (req, res) => {
    try {
        const { id } = req.params;

        const document = await DocumentModel.findById(id);
        if (!document) {
            return res.status(404).json({ message: "Document not found" });
        }

        const signatures = await SignatureModel.find({ documentId: id });
        console.log("All Signatures:", signatures);

        const pdfPath = path.join(process.cwd(), document.filePath);
        console.log("Resolved PDF Path:", pdfPath);
        const existingPdfBytes = fs.readFileSync(pdfPath);

        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const pages = pdfDoc.getPages();

        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

        signatures.forEach((sig) => {
            const pages = pdfDoc.getPages();

            for (const sig of signatures) {
                const page = pages[sig.pageNumber - 1];
                const { width, height } = page.getSize();

                const fontSize = 14;

                // Convert from percentage to absolute PDF coordinates
                const pdfX = (sig.x / 100) * width;

                // Convert Y from top-origin (browser) to bottom-origin (PDF)
                const pdfY = height - ((sig.y / 100) * height);

                page.drawText("Signed", {
                    x: pdfX,
                    y: pdfY - fontSize,
                    size: fontSize,
                    font,
                });
            }
        });

        const signedPdfBytes = await pdfDoc.save();

        const signedFileName = `signed-${Date.now()}.pdf`;

        // Create signed directory in backend root
        const signedDir = path.join(process.cwd(), "signed");

        if (!fs.existsSync(signedDir)) {
            fs.mkdirSync(signedDir);
        }

        const signedPath = path.join(signedDir, signedFileName);

        fs.writeFileSync(signedPath, signedPdfBytes);

        res.json({
            message: "Document signed successfully",
            filePath: `/signed/${signedFileName}`,
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error signing document" });
    }
});

module.exports = router;