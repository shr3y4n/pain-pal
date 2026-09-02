import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey });
const models = [
  "gemini-3.6-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-3.7-flash"
];

async function test() {
  for (const model of models) {
    try {
      console.log("Testing model:", model);
      await ai.models.generateContent({ model, contents: "test" });
      console.log("SUCCESS:", model);
    } catch(e: any) {
      console.log("FAILED:", model, e.status);
    }
  }
}
test();
