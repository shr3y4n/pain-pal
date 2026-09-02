import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey });
const models = [
  "gemini-flash-latest",
  "gemini-3.1-flash-lite",
  "gemini-3.1-pro-preview",
  "gemini-3.1-flash-lite-image",
  "gemini-3.1-flash-image",
  "gemini-3-pro-image",
  "gemini-3.1-flash-live-preview",
  "gemini-3.5-transcribe",
  "gemini-3.5-transcribe-live",
  "gemini-3.1-flash-tts-preview",
  "veo-3.1-lite-generate-preview",
  "lyria-3-clip-preview",
  "lyria-3-pro-preview",
  "gemini-3.7-flash",
  "veo-3.1-generate-preview",
  "gemini-embedding-2-preview"
];

async function test() {
  const working: string[] = [];
  for (const model of models) {
    try {
      await ai.models.generateContent({ model, contents: "test" });
      console.log("SUCCESS:", model);
      working.push(model);
    } catch(e: any) {
      if (e.status === 503) {
        console.log("503:", model);
        working.push(model); // 503 means it exists
      } else {
        console.log("FAILED:", model, e.status);
      }
    }
  }
  console.log("Working models:", working);
}
test();
