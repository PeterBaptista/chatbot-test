// Use "type: module" in package.json to use ES modules
import express from "express";
import cors from "cors";
import "dotenv/config";
const app = express();
const port = 3000;

app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") ?? [],
  })
);
// Define your routes
app.get("/", (req, res) => {
  res.json({ message: "Hello from Express on Vercel!" });
});

export { app };
