import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

async function generateContentWithFallback(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is required");
  }

  const ai = new GoogleGenAI({ apiKey });
  const models = [
    "gemini-3.6-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
    "gemini-3.7-flash"
  ];

  let lastError = null;
  for (const model of models) {
    try {
      console.log(`Attempting generation with model: ${model}`);
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
  throw lastError;
}

generateContentWithFallback("hello").then(console.log).catch(console.error);
