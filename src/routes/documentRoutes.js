const express = require("express");
const router = express.Router();
const upload = require("../middleware/uploadMiddleware");
const protect = require("../middleware/authMiddleware");
const { uploadDocument, getMyDocuments, getDocumentById } = require("../controllers/documentController");
const fs = require("fs");
const path = require("path");
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const SignatureModel = require("../models/Signature");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const Document = require("../models/Document");
const Audit = require("../models/Audit");
const { getDocumentByToken, signDocument, rejectDocument } = require("../controllers/documentController");

router.post("/upload", protect, upload.single("file"), uploadDocument);
router.get("/my-docs", protect, getMyDocuments);
router.get("/public/:token", getDocumentByToken);
router.post("/reject/:token", rejectDocument);
router.post("/sign/:token", signDocument);
router.get("/:id", protect, getDocumentById);

router.post("/:id/finalize", async (req, res) => {
    try {
        const { id } = req.params;

        const document = await Document.findById(id);
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

        for (const sig of signatures) {

            let selectedFont;

            if (sig.font === "serif") {
                selectedFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
            } 
            else if (sig.font === "monospace") {
                selectedFont = await pdfDoc.embedFont(StandardFonts.Courier);
            } 
            else {
                selectedFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
            }

            const page = pages[sig.pageNumber - 1];
            const { width, height } = page.getSize();
            const fontSize = 14;
            const pdfX = (sig.x / 100) * width;
            const pdfY = height - ((sig.y / 100) * height);
            console.log(sig.text);

            if (sig.text) {
                page.drawText(sig.text, {
                x: pdfX,
                y: pdfY - fontSize,
                size: fontSize,
                font: selectedFont,
                });
            }
        }

        document.status = "SIGNED";
        await document.save() ;
        const signedPdfBytes = await pdfDoc.save();

        const signedFileName = `signed-${Date.now()}.pdf`;

        // Create signed directory in backend root
        const signedDir = path.join(process.cwd(), "signed");

        if (!fs.existsSync(signedDir)) {
            fs.mkdirSync(signedDir);
        }

        const signedPath = path.join(signedDir, signedFileName);

        fs.writeFileSync(signedPath, signedPdfBytes);

        await Audit.create({
            documentId: document._id,
            signerEmail: document.signerEmail,
            ipAddress: req.ip,
            action: "SIGNED",
            tokenUsed: document.signatureToken,
        });

        console.log("Audit logging triggered");

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
        document.status = "PENDING";

        await document.save();

        await Audit.create({
            documentId: document._id,
            signerEmail: email,
            ipAddress: req.ip,
            action: "REQUESTED",
            tokenUsed: token,
        });
        console.log("Audit logging triggered");

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

    await Audit.create({
        documentId: document._id,
        signerEmail: document.signerEmail,
        ipAddress: req.ip,
        action: "VIEWED",
        tokenUsed: req.params.token,
    });
    console.log("Audit logging triggered");

    res.json(document);
});

router.get("/audit/:fileId", async (req, res) => {
    try {
        const logs = await Audit.find({
            documentId: req.params.fileId,
        }).sort({ createdAt: -1 });
        res.json(logs);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error fetching audit logs" });
    }
});

router.post("/reject/:token", async (req, res) => {
    try {

    const { reason } = req.body;

    const document = await Document.findOne({
        signatureToken: req.params.token,
        tokenExpiresAt: { $gt: new Date() }
    });

    if (!document)
    return res.status(404).json({ message: "Invalid or expired link" });

    document.status = "REJECTED";
    document.rejectionReason = reason;

    await document.save();

    await Audit.create({
        documentId: document._id,
        signerEmail: document.signerEmail,
        ipAddress: req.ip,
        action: "REJECTED",
        tokenUsed: req.params.token
    });

    res.json({
        message: "Document rejected successfully",
        reason
    });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Reject failed" });
    }
});

router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const document = await Document.findById(id);

        if (!document) {
            return res.status(404).json({ message: "Document not found" });
        }

        // delete PDF file from uploads folder
        const filePath = path.join(process.cwd(), document.filePath);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // delete all signatures linked to this document
        await SignatureModel.deleteMany({ documentId: id });

        // delete audit logs
        await Audit.deleteMany({ documentId: id });

        // delete document from database
        await Document.findByIdAndDelete(id);

        res.json({ message: "Document deleted successfully" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error deleting document" });
    }
});


module.exports = router;