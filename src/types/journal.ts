/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pain-Pal Client Type Definitions
 */

export type InteractionRole = "user" | "model";

export interface CrisisResource {
  name: string;
  contact: string;
  description: string;
  url?: string;
}

export interface InteractionMessage {
  id: string;
  role: InteractionRole;
  text: string;
  createdAt: number;
  modelUsed?: string;
  mood?: string;
  moodEmoji?: string;
  tags?: string[];
  insight?: string;
  safetyRouted?: boolean;
  crisisResources?: CrisisResource[];
}

export interface HistorySessionGroup {
  label: string;
  messages: InteractionMessage[];
}

export interface JournalSubmissionResponse {
  success: boolean;
  response: string;
  modelUsed: string;
  mood?: string;
  moodEmoji?: string;
  tags?: string[];
  insight?: string;
  safetyRouted?: boolean;
  crisisResources?: CrisisResource[];
  error?: string;
}
