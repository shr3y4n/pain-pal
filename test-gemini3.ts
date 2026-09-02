import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function test() {
  console.log("Calling Gemini...");
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: "test",
      config: {
        systemInstruction: "You are a thoughtful journaling assistant."
      }
    });
    console.log(response.text);
  } catch (e: any) {
    console.error("Gemini Error:", e.status, e.message);
  }
}
test();
