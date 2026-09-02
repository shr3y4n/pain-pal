import dotenv from "dotenv";
dotenv.config();
console.log("GEMINI_API_KEY is", !!process.env.GEMINI_API_KEY);
