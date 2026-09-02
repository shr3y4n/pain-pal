import { getAuth } from "firebase-admin/auth";
import { initializeApp } from "firebase-admin/app";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
initializeApp({ projectId: firebaseConfig.projectId });

async function test() {
  try {
    const token = await getAuth().createCustomToken("test-uid");
    console.log("Custom token:", token.substring(0,20));
  } catch(e) {
    console.error("Auth error:", e);
  }
}
test();
