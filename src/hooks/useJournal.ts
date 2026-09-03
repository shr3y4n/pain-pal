/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pain-Pal Journal Hook
 * Coordinates backend history loading (GET /api/journal/history),
 * real-time Firestore synchronization, and authenticated reflection dispatch (POST /api/journal).
 */

import { useEffect, useState, useCallback } from "react";
import { User } from "firebase/auth";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
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
          if (isMounted && Array.isArray(data.interactions)) {
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

        if (isMounted) {
          setMessages(liveTurns);
          const lastModel = [...liveTurns].reverse().find((m) => m.role === "model" && m.modelUsed);
          if (lastModel?.modelUsed) {
            setActiveModel(lastModel.modelUsed);
          }
        }
      },
      (syncErr) => {
        console.error("Firestore sync error:", syncErr);
        if (isMounted) {
          setError("Unable to sync private journal entries in real-time.");
        }
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [user]);

  // 3. Submit journal prompt to POST /api/journal
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

        const data: JournalSubmissionResponse = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to process reflection.");
        }

        if (data.modelUsed) {
          setActiveModel(data.modelUsed);
        }

        return true;
      } catch (err: any) {
        console.error("Submission failed:", err);
        setError(err?.message || "Unable to reach reflection companion. Please try again.");
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
