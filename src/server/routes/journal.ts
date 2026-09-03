/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pain-Pal Journal API Routes
 * Handles user reflections, multi-turn history loading, safety routing,
 * Gemini fallback generation, and server-side Firestore persistence.
 */

import { Router, Request, Response } from "express";
import { requireFirebaseAuth, checkUserRateLimit } from "../middleware/auth";
import { classifyPromptSafety } from "../services/safety";
import { generateReflectionWithFallback } from "../services/gemini";
import {
  getUserRecentInteractions,
  saveInteraction,
  recordSafetyEvent
} from "../services/firestore";

const router = Router();
const MAX_PROMPT_LENGTH = 5000;

router.post("/api/journal", requireFirebaseAuth, async (req: Request, res: Response) => {
  const userId = req.user!.uid;

  // 1. Rate-limiting check per authenticated user
  if (!checkUserRateLimit(userId, 20, 60_000)) {
    res.status(429).json({
      error: "You are submitting reflections too quickly. Please pause and take a breath for a minute."
    });
    return;
  }

  // 2. Defensive Payload Ingestion & Validation
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const rawPrompt = body.prompt;

  if (typeof rawPrompt !== "string") {
    res.status(400).json({
      error: "Invalid request format. 'prompt' must be a valid text string."
    });
    return;
  }

  const prompt = rawPrompt.trim();
  if (prompt.length === 0) {
    res.status(400).json({
      error: "Your reflection cannot be empty. Please share a thought or feeling."
    });
    return;
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    res.status(400).json({
      error: `Reflection exceeds the maximum limit of ${MAX_PROMPT_LENGTH} characters (currently ${prompt.length}).`
    });
    return;
  }

  const now = Date.now();

  try {
    // 3. Safety Routing Layer (Checked BEFORE any call to Gemini)
    const safetyCheck = classifyPromptSafety(prompt);

    if (safetyCheck.isElevated) {
      console.log(`🛡️  Safety route activated for user ${userId.substring(0, 5)}...`);

      // Persist the user turn and the canned safety response to user's private journal
      await saveInteraction(userId, {
        role: "user",
        text: prompt,
        createdAt: now
      });

      const safetyResponseText =
        safetyCheck.safetyResponse ||
        "Your safety is deeply important. Please reach out to emergency services (112 or 911) or Tele-MANAS (14416) for immediate human support.";

      await saveInteraction(userId, {
        role: "model",
        text: safetyResponseText,
        createdAt: now + 1,
        modelUsed: "safety-guard",
        safetyRouted: true
      });

      // Minimal privacy-preserving audit record (no user text stored)
      await recordSafetyEvent(userId, "elevated");

      res.json({
        success: true,
        response: safetyResponseText,
        safetyRouted: true,
        crisisResources: safetyCheck.crisisResources,
        modelUsed: "safety-guard"
      });
      return;
    }

    // 4. Normal Path: Load recent conversation history for genuine multi-turn context
    const recentHistory = await getUserRecentInteractions(userId, 8);

    // 5. Generate reflection across the Gemini model fallback ladder
    const aiResult = await generateReflectionWithFallback(recentHistory, prompt);

    // 6. Server-Side Persistence via Admin SDK (Hard requirement)
    // Persist user prompt
    await saveInteraction(userId, {
      role: "user",
      text: prompt,
      createdAt: now
    });

    // Persist model response
    await saveInteraction(userId, {
      role: "model",
      text: aiResult.reflection,
      createdAt: now + 1,
      modelUsed: aiResult.model,
      mood: aiResult.mood,
      moodEmoji: aiResult.moodEmoji,
      tags: aiResult.tags,
      insight: aiResult.insight
    });

    // 7. Return clean structured response
    res.json({
      success: true,
      response: aiResult.reflection,
      mood: aiResult.mood,
      moodEmoji: aiResult.moodEmoji,
      tags: aiResult.tags,
      insight: aiResult.insight,
      modelUsed: aiResult.model
    });
  } catch (error: any) {
    console.error("Journal reflection error:", error?.message || error);

    // Generic safe error — never expose internal keys, stack traces, or model raw errors
    res.status(500).json({
      error: "Pain-Pal reflection service is momentarily busy. Your entry is preserved; please try submitting again in a few moments."
    });
  }
});

export default router;
