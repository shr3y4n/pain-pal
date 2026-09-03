/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pain-Pal Server Entrypoint
 * Unifies Express API server, Firebase Admin initialization, Secret Manager retrieval,
 * and Vite SPA serving for local development & Google Cloud Run production.
 */

import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { initializeApp, getApps } from "firebase-admin/app";
import dotenv from "dotenv";
import fs from "fs";

import { initializeGeminiSecret } from "./src/server/services/secrets";
import journalRouter from "./src/server/routes/journal";

dotenv.config();

// ── 1. Firebase Admin Initialization ─────────────────────────────────────────
let firebaseProjectId: string | undefined;
try {
  if (fs.existsSync("./firebase-applet-config.json")) {
    const firebaseConfig = JSON.parse(
      fs.readFileSync("./firebase-applet-config.json", "utf-8")
    );
    firebaseProjectId = firebaseConfig.projectId;
  }
} catch (e) {
  console.warn("Could not read firebase-applet-config.json. Relying on default GCP project.");
}

if (!getApps().length) {
  try {
    initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || firebaseProjectId || process.env.GOOGLE_CLOUD_PROJECT
    });
    console.log("✅ Firebase Admin SDK initialized successfully");
  } catch (error) {
    console.error("Firebase Admin initialization error:", error);
  }
}

// ── 2. Express Server Bootstrap ──────────────────────────────────────────────
async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);

  // Initialize Secrets (Secret Manager in production, env in development)
  try {
    await initializeGeminiSecret();
    console.log("✅ Gemini API secret initialized securely");
  } catch (err: any) {
    console.error("⚠️  Failed to initialize Gemini secret:", err?.message || err);
    if (process.env.NODE_ENV === "production") {
      console.error("Fatal: Cannot run in production without Gemini API secret.");
      process.exit(1);
    }
  }

  // Cross-Origin Resource Sharing
  app.use(cors());

  // Top-Level Request Deserialization (Ordering Guarantee: Must precede all endpoints)
  app.use(express.json({ limit: "10kb" }));

  // Liveness / Health Check
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "pain-pal",
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString()
    });
  });

  // Mount Application Routes
  app.use(journalRouter);

  // Static / Vite Dev Middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Pain-Pal server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start Pain-Pal server:", err);
  process.exit(1);
});
