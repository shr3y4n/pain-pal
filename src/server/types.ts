/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pain-Pal Server Types
 */

export type InteractionRole = "user" | "model";

export interface InteractionRecord {
  id?: string;
  role: InteractionRole;
  text: string;
  createdAt: number;
  modelUsed?: string;
  mood?: string;
  moodEmoji?: string;
  tags?: string[];
  insight?: string;
  safetyRouted?: boolean;
}

export interface JournalRequestBody {
  prompt: string;
}

export interface GeminiTurn {
  role: "user" | "model";
  parts: Array<{ text: string }>;
}

export interface GeminiReflectionResult {
  reflection: string;
  mood?: string;
  moodEmoji?: string;
  tags?: string[];
  insight?: string;
  model: string;
}

export interface SafetyCheckResult {
  isElevated: boolean;
  category?: "self_harm" | "violence" | "crisis";
  safetyResponse?: string;
  crisisResources?: Array<{
    name: string;
    contact: string;
    description: string;
    url?: string;
  }>;
}

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  name?: string;
}
