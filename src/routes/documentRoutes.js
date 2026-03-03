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
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const Document = require("../models/Document");

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

router.post("/:id/request-signature", async (req, res) => {
    try {
        const { email } = req.body;

        const document = await Document.findById(req.params.id);
        if (!document) return res.status(404).json({ message: "Document not found" });

        const token = crypto.randomBytes(32).toString("hex");

        document.signatureToken = token;
        document.tokenExpiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
        document.signerEmail = email;

        await document.save();

        const link = `http://localhost:5173/sign/${token}`;

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
            });

            await transporter.sendMail({
                from: `"Document Signature App" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: "Please Sign This Document",
                html: `
                    <h2>Signature Request</h2>
                    <p>You have been requested to sign a document.</p>
                    <a href="${link}" target="_blank">Click Here to Sign</a>
                    <p>This link expires in 1 hour.</p>
                `,
            });
            
        res.json({ message: "Signature link generated", link });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error generating link" });
    }
});

router.get("/public/:token", async (req, res) => {
    const document = await Document.findOne({
        signatureToken: req.params.token,
        tokenExpiresAt: { $gt: new Date() },
    });

    if (!document)
        return res.status(404).json({ message: "Invalid or expired link" });

    res.json(document);
});

module.exports = router;