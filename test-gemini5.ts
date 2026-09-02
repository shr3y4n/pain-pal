import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

async function generateContentWithFallback(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey });
  const models = [
    "gemini-3.6-flash",
    "gemini-3.1-flash-lite"
  ];

  let lastError = null;
  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt
      });
      return { response: response.text, model };
    } catch (error: any) {
      lastError = error;
      const status = error?.status || error?.response?.status;
      if (status === 503 || status === 429 || status === 404 || status === 500) {
        continue;
      }
      throw error; 
    }
  }
  throw lastError;
}

async function run() {
  for (let i = 0; i < 5; i++) {
    try {
      const res = await generateContentWithFallback("hello " + i);
      console.log(`Run ${i}: SUCCESS`);
    } catch(e) {
      console.log(`Run ${i}: FAILED`);
    }
  }
}
run();
