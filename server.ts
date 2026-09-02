import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { getAuth } from "firebase-admin/auth";
import { initializeApp } from "firebase-admin/app";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

let firebaseConfig: any = {};
try {
  firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
} catch (e) {
  console.warn("Could not load firebase-applet-config.json. Using defaults.");
}

// Initialize Firebase Admin SDK for Auth verification
try {
  initializeApp({
    projectId: firebaseConfig.projectId
  });
  console.log("Firebase Admin initialized");
} catch (error) {
  console.error("Firebase Admin initialization error:", error);
}

// 1. Resilient Model Fallback Ladder Helper
async function generateContentWithFallback(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is required");
  }

  const ai = new GoogleGenAI({ apiKey });
  const models = [
    "gemini-3.1-flash-lite",
    "gemini-3.7-flash",
    "gemini-flash-latest",
    "gemini-pro-latest"
  ];

  let lastError = null;
  const maxRetries = 2; // Try the entire ladder up to 2 times
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    for (const model of models) {
      try {
        console.log(`[Attempt ${attempt}] Generation with model: ${model}`);
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction: "You are a thoughtful journaling assistant. The user will share journal entries or reflections. Respond thoughtfully, summarize key themes, and offer a gentle, encouraging perspective.",
          }
        });
        return { response: response.text, model };
      } catch (error: any) {
        console.error(`Model ${model} failed:`, error?.message || error);
        lastError = error;
        const status = error?.status || error?.response?.status;
        // Recoverable errors
        if (status === 503 || status === 429 || status === 404 || status === 500) {
          continue;
        }
        throw error; // Unrecoverable
      }
    }
    // Wait a short bit before retrying the ladder
    if (attempt < maxRetries) {
      console.log(`All models failed on attempt ${attempt}, waiting before retry...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  throw lastError;
}

// JWT Verification Middleware
async function verifyFirebaseToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }
  const token = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    (req as any).user = decodedToken;
    next();
  } catch (error) {
    console.error("Token verification failed:", error);
    res.status(401).json({ error: "Unauthorized" });
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());

  // 1. Top-Level Request Deserialization (Ordering Guarantee)
  app.use(express.json());
  
  // Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Journal Endpoint (Generate & Save)
  app.post("/api/journal", verifyFirebaseToken, async (req, res) => {
    // 2. Defensive Payload Ingestion (Null-Safe Destructuring)
    const data = (req.body && typeof req.body === 'object') ? req.body : {};
    const { prompt } = data;
    
    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: "Invalid payload: 'prompt' must be a non-empty string." });
      return;
    }

    const userId = (req as any).user.uid;
    
    try {
      // Generate Content
      const aiResult = await generateContentWithFallback(prompt);
      
      res.json({ 
        success: true, 
        response: aiResult.response,
        modelUsed: aiResult.model
      });
    } catch (error: any) {
      console.error("Journal processing failed:", error);
      // 4. Explicit Error Escalation
      res.status(500).json({ error: `Failed to process journal entry: ${error.message}` });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
