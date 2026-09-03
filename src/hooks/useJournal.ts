/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pain-Pal Journal Hook
 * Coordinates backend history loading (GET /api/journal/history),
 * real-time Firestore synchronization, and authenticated reflection dispatch (POST /api/journal).
 *
 * SECURITY STANDARD:
 * All Gemini generation and secret handling is strictly server-authoritative via Cloud Run.
 * The client browser NEVER holds or calls Gemini API keys directly.
 */

import { useEffect, useState, useCallback } from "react";
import { User } from "firebase/auth";
import { collection, query, orderBy, onSnapshot, doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { InteractionMessage, JournalSubmissionResponse } from "../types/journal";

export function useJournal(user: User | null) {
  const [messages, setMessages] = useState<InteractionMessage[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeModel, setActiveModel] = useState<string | null>(null);

  // 1. Initial Load from server-authoritative GET /api/journal/history
  useEffect(() => {
    if (!user) {
      setMessages([]);
      setLoadingHistory(false);
      return;
    }

    let isMounted = true;
    setLoadingHistory(true);

    const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

    async function fetchInitialHistory() {
      try {
        const token = await user!.getIdToken();
        const res = await fetch(`${apiBase}/api/journal/history`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data.interactions) && data.interactions.length > 0) {
            setMessages(data.interactions);
          }
        }
      } catch (err) {
        console.warn("Server history fetch fallback to real-time sync:", err);
      } finally {
        if (isMounted) {
          setLoadingHistory(false);
        }
      }
    }

    fetchInitialHistory();

    // 2. Real-time Firestore sync listener scoped strictly to authenticated user's interactions
    const q = query(
      collection(db, "users", user.uid, "interactions"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const liveTurns: InteractionMessage[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          if (d.role && d.text) {
            liveTurns.push({
              id: docSnap.id,
              role: d.role,
              text: d.text,
              createdAt: Number(d.createdAt) || Date.now(),
              modelUsed: d.modelUsed,
              mood: d.mood,
              moodEmoji: d.moodEmoji,
              tags: d.tags,
              insight: d.insight,
              safetyRouted: d.safetyRouted,
              crisisResources: d.crisisResources
            });
          }
        });

        if (isMounted && liveTurns.length > 0) {
          setMessages((prev) => {
            const docIds = new Set(liveTurns.map((t) => t.id));
            const pendingOptimistic = prev.filter((p) => !docIds.has(p.id));
            const combined = [...liveTurns, ...pendingOptimistic].sort(
              (a, b) => a.createdAt - b.createdAt
            );

            // Deduplicate matching role + text within 5 seconds
            const unique: InteractionMessage[] = [];
            for (const item of combined) {
              const dup = unique.find(
                (u) =>
                  u.role === item.role &&
                  u.text === item.text &&
                  Math.abs(u.createdAt - item.createdAt) < 5000
              );
              if (!dup) {
                unique.push(item);
              }
            }
            return unique;
          });

          const lastModel = [...liveTurns].reverse().find((m) => m.role === "model" && m.modelUsed);
          if (lastModel?.modelUsed) {
            setActiveModel(lastModel.modelUsed);
          }
        }
      },
      (syncErr) => {
        console.warn("Firestore sync notification:", syncErr?.message || syncErr);
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [user]);

  // 3. Submit journal prompt strictly through backend API (Cloud Run / Express)
  const submitReflection = useCallback(
    async (promptText: string): Promise<boolean> => {
      if (!user) {
        setError("Please sign in to save reflections.");
        return false;
      }

      const trimmed = promptText.trim();
      if (!trimmed) {
        return false;
      }

      if (trimmed.length > 5000) {
        setError("Reflections are limited to 5,000 characters.");
        return false;
      }

      setIsSubmitting(true);
      setError(null);

      const now = Date.now();
      const userMsg: InteractionMessage = {
        id: `user-${now}`,
        role: "user",
        text: trimmed,
        createdAt: now
      };

      // Optimistically add user turn immediately
      setMessages((prev) => [...prev, userMsg]);

      try {
        const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
        const token = await user.getIdToken();

        const res = await fetch(`${apiBase}/api/journal`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ prompt: trimmed })
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(
            errJson.error || `Reflection service responded with status ${res.status}`
          );
        }

        const data: JournalSubmissionResponse = await res.json();

        if (data.modelUsed) {
          setActiveModel(data.modelUsed);
        }

        const modelMsg: InteractionMessage = {
          id: `model-${now + 1}`,
          role: "model",
          text: data.response,
          createdAt: now + 1,
          modelUsed: data.modelUsed,
          mood: data.mood,
          moodEmoji: data.moodEmoji,
          tags: data.tags,
          insight: data.insight,
          safetyRouted: data.safetyRouted,
          crisisResources: data.crisisResources
        };

        // Immediately display the model's reflection
        setMessages((prev) => [...prev, modelMsg]);

        // Client-side Firestore backup persistence
        try {
          const userDocRef = doc(collection(db, "users", user.uid, "interactions"), userMsg.id);
          const modelDocRef = doc(collection(db, "users", user.uid, "interactions"), modelMsg.id);

          const modelPayload: Record<string, any> = {
            role: "model",
            text: data.response,
            createdAt: now + 1
          };
          if (data.modelUsed) modelPayload.modelUsed = data.modelUsed;
          if (data.mood) modelPayload.mood = data.mood;
          if (data.moodEmoji) modelPayload.moodEmoji = data.moodEmoji;
          if (data.tags && data.tags.length > 0) modelPayload.tags = data.tags;
          if (data.insight) modelPayload.insight = data.insight;
          if (data.safetyRouted) modelPayload.safetyRouted = data.safetyRouted;

          await setDoc(userDocRef, {
            role: "user",
            text: trimmed,
            createdAt: now
          });
          await setDoc(modelDocRef, modelPayload);
        } catch (clientFsErr) {
          console.warn("Client Firestore backup save notice:", clientFsErr);
        }

        return true;
      } catch (err: any) {
        console.error("Submission failed:", err);
        // Remove optimistic user turn if submission failed
        setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
        setError(
          err?.message ||
            "Unable to reach the Pain-Pal backend reflection service. Please verify your backend deployment."
        );
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [user]
  );

  return {
    messages,
    loadingHistory,
    isSubmitting,
    error,
    setError,
    activeModel,
    submitReflection
  };
}
