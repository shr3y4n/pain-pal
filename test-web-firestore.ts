import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function test() {
  console.log("Setting doc...");
  try {
    await setDoc(doc(db, "users", "test", "interactions", "test"), { hello: "world" });
    console.log("Success!");
  } catch(e) {
    console.error("Error:", e);
  }
}
test();
