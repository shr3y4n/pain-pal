import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey });
const models = ["gemini-3.1-flash-lite"];

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
