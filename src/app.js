const express = require("express");
const cors = require("cors");
const protect = require("./middleware/authMiddleware");
const documentRoutes = require("./routes/documentRoutes");

const authRoutes = require("./routes/authRoutes");
const signatureRoutes = require("./routes/signatureRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/uploads", express.static("uploads"));
app.use("/signed", express.static("signed"));

app.get("/", (req, res) => {
  res.send("API Running");
});

app.get("/api/protected", protect, (req, res) => {
  res.json({
    message: "You accessed protected route",
    user: req.user,
  });
});

app.use("/api/docs", documentRoutes);
app.use("/api/signatures", signatureRoutes);

module.exports = app;