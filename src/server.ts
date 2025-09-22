import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import "dotenv/config";

const app = express();

// Fix for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") ?? [],
  })
);

// ✅ Endpoint returning QR Code as base64 JSON
app.get("/qrcode", (req, res) => {
  const imagePath = path.join(__dirname, "qrcode.png");

  try {
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString("base64");

    res.json({
      qrCodeUrl: `data:image/png;base64,${base64Image}`,
    });
  } catch (err) {
    console.error("Error reading QR Code:", err);
    res.status(500).json({ error: "Failed to read QR Code image" });
  }
});

export { app };
