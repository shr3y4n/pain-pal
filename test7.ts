import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

async function run() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const models = [
    "gemini-3.6-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
    "gemini-3.7-flash"
  ];
  for (const m of models) {
    console.log("Trying", m);
    try {
      await ai.models.generateContent({ model: m, contents: "Hello" });
      console.log("Success on", m);
      return;
    } catch(e: any) {
      console.log("Failed", m, e?.status);
    }
  }
}
run();
