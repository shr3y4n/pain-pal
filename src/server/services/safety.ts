/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pain-Pal Safety Routing Layer
 *
 * Purpose:
 * Evaluates journal entries before sending them to Gemini to identify explicit
 * statements of immediate self-harm, imminent crisis, or violence towards others.
 *
 * IMPORTANT:
 * - Pain-Pal is a reflection companion, not a healthcare or diagnostic system.
 * - This layer is an automated routing safeguard, not continuous surveillance.
 * - Ordinary negative emotions (sadness, grief, anger, frustration, stress) are
 *   NEVER flagged and proceed normally through journaling.
 * - For elevated risk, the user prompt is NOT sent to external AI. Instead, a calm,
 *   predefined safety message with verified crisis resources is returned.
 * - In accordance with privacy minimization, dangerous prompt text is NEVER stored
 *   in separate safety logs.
 */

import { SafetyCheckResult } from "../types";

export const VERIFIED_CRISIS_RESOURCES = [
  {
    name: "Tele-MANAS (India Comprehensive Mental Health)",
    contact: "14416 or 1800-891-4416",
    description: "24/7 free, confidential mental health tele-counseling by Govt. of India",
    url: "https://telemanas.mohfw.gov.in"
  },
  {
    name: "Kiran Mental Health Helpline (India)",
    contact: "1800-599-0019",
    description: "24/7 toll-free helpline by Ministry of Social Justice & Empowerment",
    url: "https://disabilityaffairs.gov.in"
  },
  {
    name: "Emergency Services",
    contact: "112 (India / EU / International) or 911 (US/Canada)",
    description: "Immediate emergency assistance for urgent physical safety",
  },
  {
    name: "988 Suicide & Crisis Lifeline (US & Canada)",
    contact: "988 (Call or Text)",
    description: "24/7 free and confidential support from trained crisis counselors",
    url: "https://988lifeline.org"
  }
];

// Patterns for explicit immediate crisis, self-harm intent, or violence
// Designed specifically to avoid ordinary distress/sadness.
const SELF_HARM_INTENT_PATTERNS = [
  /\b(kill\s+(my\s*self|me)|commit\s+suicide|end\s+my\s+life|ending\s+my\s+life)\b/i,
  /\b(hang\s+myself|shoot\s+myself|slit\s+my\s+wrists?|jump\s+off\s+a\s+(bridge|building|roof))\b/i,
  /\b(want\s+to\s+die|wish\s+i\s+were\s+dead|can'?t\s+go\s+on\s+living)\b/i,
  /\b(how\s+to\s+(kill\s+myself|commit\s+suicide|overdose|slit\s+wrists?))\b/i,
  /\b(planning\s+my\s+suicide|suicide\s+note|goodbye\s+cruel\s+world)\b/i
];

const VIOLENCE_INTENT_PATTERNS = [
  /\b(going\s+to|planning\s+to|want\s+to)\s+(kill|murder|shoot|stab)\s+(someone|them|people|her|him|others)\b/i,
  /\b(how\s+to\s+(make\s+a\s+bomb|mass\s+casualty|poison\s+someone))\b/i
];

/**
 * Classifies a journal prompt for safety routing.
 * Returns isElevated = true ONLY for explicit imminent danger or acute self-harm/violence.
 */
export function classifyPromptSafety(text: string): SafetyCheckResult {
  if (!text || typeof text !== "string") {
    return { isElevated: false };
  }

  const normalized = text.toLowerCase().trim();

  // 1. Check for explicit self-harm intent
  for (const pattern of SELF_HARM_INTENT_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        isElevated: true,
        category: "self_harm",
        safetyResponse: buildSafetyResponse("self_harm"),
        crisisResources: VERIFIED_CRISIS_RESOURCES
      };
    }
  }

  // 2. Check for explicit violence/harm towards others
  for (const pattern of VIOLENCE_INTENT_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        isElevated: true,
        category: "violence",
        safetyResponse: buildSafetyResponse("violence"),
        crisisResources: VERIFIED_CRISIS_RESOURCES
      };
    }
  }

  // Normal emotional reflections pass through
  return { isElevated: false };
}

/**
 * Prepares a calm, supportive, non-clinical safety response.
 * Does NOT diagnose or pretend to provide therapy.
 */
function buildSafetyResponse(category: "self_harm" | "violence"): string {
  if (category === "self_harm") {
    return [
      "It sounds like you are going through an extraordinarily difficult moment right now.",
      "",
      "Pain-Pal is a private space for reflection, but because your safety matters deeply and I am an automated program rather than a person or medical professional, I want to encourage you to connect with human support right now.",
      "",
      "If you are in immediate distress or considering ending your life, please reach out to someone who can help keep you safe:",
      "",
      "• In India: Call Tele-MANAS at 14416 or 1800-891-4416 (24/7 Toll-Free) or the Kiran Helpline at 1800-599-0019.",
      "• In the US/Canada: Call or text 988 to connect with the 988 Suicide & Crisis Lifeline.",
      "• Emergency Services: Call 112 (India / International) or 911 (US/Canada).",
      "",
      "Please also consider reaching out to a trusted friend, family member, or counselor nearby. You don't have to carry this alone."
    ].join("\n");
  }

  return [
    "It sounds like you are experiencing intense anger or distress right now.",
    "",
    "Because your safety and the safety of others is vital, Pain-Pal cannot assist with thoughts of violence or harming anyone.",
    "",
    "If you feel you might lose control, please take a step back from this device and contact emergency support or a professional who can help de-escalate this moment:",
    "",
    "• National Emergency Assistance: Call 112 (India / International) or 911 (US/Canada).",
    "• Mental Health Support (India): Tele-MANAS at 14416 or 1800-891-4416.",
    "",
    "Speaking to a professional or a calm person you trust can provide a safe way to work through this tension."
  ].join("\n");
}
