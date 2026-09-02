import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function test() {
  console.log("Calling Gemini...");
  try {
    const res = await ai.models.generateContent({ model: "gemini-3.6-flash", contents: "test" });
    console.log(res.text);
  } catch (e: any) {
    console.error("Gemini Error:", e.status, e.message);
  }
}
test();
