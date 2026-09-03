/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pain-Pal Firestore Persistence Service
 * Server-side persistence via Firebase Admin SDK.
 * All paths are authoritatively scoped to the verified Firebase Auth UID:
 * users/{userId}/interactions/{interactionId}
 */

import { getFirestore, Firestore } from "firebase-admin/firestore";
import { InteractionRecord } from "../types";
import fs from "fs";

let dbInstance: Firestore | null = null;

export function getAdminFirestore(): Firestore {
  if (!dbInstance) {
    let databaseId: string | undefined = process.env.FIRESTORE_DATABASE_ID;
    if (!databaseId) {
      try {
        if (fs.existsSync("./firebase-applet-config.json")) {
          const config = JSON.parse(
            fs.readFileSync("./firebase-applet-config.json", "utf-8")
          );
          databaseId = config.firestoreDatabaseId;
        }
      } catch (e) {
        console.warn("Could not read firestoreDatabaseId from config; using default.");
      }
    }

    const targetDbId = databaseId && databaseId !== "(default)" ? databaseId : "(default)";
    dbInstance = getFirestore(undefined, targetDbId);
  }
  return dbInstance;
}

/**
 * Loads recent interactions for an authenticated user, ordered chronologically.
 */
export async function getUserRecentInteractions(
  userId: string,
  limitCount: number = 8
): Promise<InteractionRecord[]> {
  try {
    const db = getAdminFirestore();
    const snapshot = await db
      .collection("users")
      .doc(userId)
      .collection("interactions")
      .orderBy("createdAt", "desc")
      .limit(limitCount)
      .get();

    const results: InteractionRecord[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      results.push({
        id: doc.id,
        role: data.role as "user" | "model",
        text: data.text || "",
        createdAt: Number(data.createdAt) || Date.now(),
        modelUsed: data.modelUsed,
        mood: data.mood,
        moodEmoji: data.moodEmoji,
        tags: data.tags,
        insight: data.insight,
        safetyRouted: data.safetyRouted
      });
    });

    // Return in ascending chronological order (oldest to newest) for conversation context
    return results.reverse();
  } catch (error: any) {
    console.error(`Failed to load history for user ${userId}:`, error?.message || error);
    return [];
  }
}

/**
 * Saves a single interaction turn (user or model) to Firestore server-side.
 */
export async function saveInteraction(
  userId: string,
  record: InteractionRecord
): Promise<string> {
  const db = getAdminFirestore();
  const interactionId = record.id || `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  // Construct payload with only defined fields (Firestore rejects undefined)
  const payload: Record<string, any> = {
    role: record.role,
    text: record.text,
    createdAt: record.createdAt || Date.now()
  };

  if (record.modelUsed) payload.modelUsed = record.modelUsed;
  if (record.mood) payload.mood = record.mood;
  if (record.moodEmoji) payload.moodEmoji = record.moodEmoji;
  if (record.tags && record.tags.length > 0) payload.tags = record.tags;
  if (record.insight) payload.insight = record.insight;
  if (record.safetyRouted) payload.safetyRouted = record.safetyRouted;

  await db
    .collection("users")
    .doc(userId)
    .collection("interactions")
    .doc(interactionId)
    .set(payload);

  return interactionId;
}

/**
 * Privacy-minimizing safety event logging.
 * IMPORTANT: Does NOT store dangerous prompt text. Only minimal operational metadata.
 */
export async function recordSafetyEvent(
  userId: string,
  severity: "elevated" | "standard"
): Promise<void> {
  try {
    const db = getAdminFirestore();
    const eventId = `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    await db
      .collection("users")
      .doc(userId)
      .collection("safety_events")
      .doc(eventId)
      .set({
        type: "safety_route",
        severity,
        createdAt: Date.now()
      });
  } catch (err: any) {
    console.warn("Failed to persist safety event metadata:", err?.message);
  }
}
