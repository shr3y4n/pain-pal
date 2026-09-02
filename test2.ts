import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import fs from "fs";

let firebaseConfig: any = {};
try {
  firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
} catch (e) {}

initializeApp({ projectId: firebaseConfig.projectId });

async function test() {
  console.log("Testing verifyIdToken...");
  try {
    await getAuth().verifyIdToken("invalid-token");
    console.log("Success!");
  } catch(e) {
    console.error("Error:", e);
  }
}
test();
