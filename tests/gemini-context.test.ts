/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Gemini Multi-Turn Context Construction Tests
 */

import { describe, it, expect } from "vitest";
import { buildMultiTurnContents } from "../src/server/services/gemini";
import { InteractionRecord } from "../src/server/types";

describe("Gemini Multi-Turn Context Builder", () => {
  it("builds a single user turn when history is empty", () => {
    const contents = buildMultiTurnContents([], "Today was peaceful.");
    expect(contents).toEqual([
      {
        role: "user",
        parts: [{ text: "Today was peaceful." }]
      }
    ]);
  });

  it("incorporates valid alternating turns correctly", () => {
    const history: InteractionRecord[] = [
      { role: "user", text: "I've been feeling stressed.", createdAt: 1000 },
      { role: "model", text: "Take a gentle breath.", createdAt: 1001 }
    ];

    const contents = buildMultiTurnContents(history, "How do I relax?");
    expect(contents).toHaveLength(3);
    expect(contents[0].role).toBe("user");
    expect(contents[0].parts[0].text).toBe("I've been feeling stressed.");
    expect(contents[1].role).toBe("model");
    expect(contents[1].parts[0].text).toBe("Take a gentle breath.");
    expect(contents[2].role).toBe("user");
    expect(contents[2].parts[0].text).toBe("How do I relax?");
  });

  it("ensures history starts with a user turn (drops leading model turns)", () => {
    const history: InteractionRecord[] = [
      { role: "model", text: "Welcome to Pain-Pal!", createdAt: 500 },
      { role: "user", text: "I need to talk.", createdAt: 600 },
      { role: "model", text: "I'm listening.", createdAt: 700 }
    ];

    const contents = buildMultiTurnContents(history, "I feel lost.");
    expect(contents[0].role).toBe("user");
    expect(contents[0].parts[0].text).toBe("I need to talk.");
  });

  it("limits conversation history to maxHistoryTurns parameter", () => {
    const history: InteractionRecord[] = [];
    for (let i = 0; i < 20; i++) {
      history.push({
        role: i % 2 === 0 ? "user" : "model",
        text: `Turn ${i}`,
        createdAt: 1000 + i
      });
    }

    const contents = buildMultiTurnContents(history, "Latest prompt", 4);
    // 4 history turns + 1 latest user prompt = 5 turns
    expect(contents.length).toBeLessThanOrEqual(5);
    expect(contents[contents.length - 1].parts[0].text).toBe("Latest prompt");
  });
});
