import { initializeApp, getApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

let firebaseConfig: any = {};
try {
  firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
} catch (e) {}

initializeApp({ projectId: firebaseConfig.projectId });
const db = getFirestore(getApp(), firebaseConfig.firestoreDatabaseId);

async function test() {
  console.log("Testing Firestore...");
  try {
    await db.collection("test").doc("test").set({ hello: "world" });
    console.log("Success!");
  } catch(e) {
    console.error("Error:", e);
  }
}
test();
