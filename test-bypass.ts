import express from "express";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(express.json());

async function generateContentWithFallback(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: prompt
  });
  return { response: response.text, model: "gemini-3.6-flash" };
}

app.post("/api/test", async (req, res) => {
  try {
    const aiResult = await generateContentWithFallback(req.body.prompt);
    res.json(aiResult);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

const server = app.listen(3001, async () => {
  console.log("Server listening");
  const res = await fetch("http://localhost:3001/api/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: "hello" })
  });
  console.log(await res.json());
  server.close();
});
