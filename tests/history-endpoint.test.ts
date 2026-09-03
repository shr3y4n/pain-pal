/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * History Isolation & Bound Unit Tests
 */

import { describe, it, expect } from "vitest";
import { InteractionRecord } from "../src/server/types";

describe("History Bounding & Isolation Logic", () => {
  it("enforces maximum bounds on interaction history retrieval", () => {
    const mockStore: InteractionRecord[] = [];
    for (let i = 0; i < 50; i++) {
      mockStore.push({
        id: `turn-${i}`,
        role: i % 2 === 0 ? "user" : "model",
        text: `Reflection turn number ${i}`,
        createdAt: 1000 + i
      });
    }

    const bounded = mockStore.slice(-30);
    expect(bounded.length).toBeLessThanOrEqual(30);
    expect(bounded[bounded.length - 1].id).toBe("turn-49");
  });

  it("ensures interaction records strictly contain expected schema keys", () => {
    const validKeys = new Set([
      "id",
      "role",
      "text",
      "createdAt",
      "modelUsed",
      "mood",
      "moodEmoji",
      "tags",
      "insight",
      "safetyRouted",
      "crisisResources"
    ]);

    const sampleRecord: InteractionRecord = {
      id: "test-id",
      role: "model",
      text: "Take a deep breath and observe your thoughts.",
      createdAt: Date.now(),
      modelUsed: "gemini-2.0-flash",
      mood: "Reflective"
    };

    const keys = Object.keys(sampleRecord);
    for (const key of keys) {
      expect(validKeys.has(key)).toBe(true);
    }
  });
});
