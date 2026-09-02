import { getAuth } from "firebase-admin/auth";
import { initializeApp } from "firebase-admin/app";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
initializeApp({ projectId: firebaseConfig.projectId });

async function test() {
  try {
    await getAuth().verifyIdToken("invalid");
  } catch(e: any) {
    console.error("Error code:", e.code);
  }
}
test();
