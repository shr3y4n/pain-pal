/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Input Validation & Boundary Unit Tests
 */

import { describe, it, expect } from "vitest";

function validatePrompt(rawPrompt: unknown): { valid: boolean; error?: string } {
  if (typeof rawPrompt !== "string") {
    return { valid: false, error: "Invalid request format. 'prompt' must be a valid text string." };
  }

  const trimmed = rawPrompt.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: "Your reflection cannot be empty." };
  }

  if (trimmed.length > 5000) {
    return { valid: false, error: "Reflection exceeds the maximum limit of 5000 characters." };
  }

  return { valid: true };
}

describe("Journal Input Validation Logic", () => {
  it("rejects non-string payloads", () => {
    expect(validatePrompt(null).valid).toBe(false);
    expect(validatePrompt(undefined).valid).toBe(false);
    expect(validatePrompt(12345).valid).toBe(false);
    expect(validatePrompt({ text: "hello" }).valid).toBe(false);
    expect(validatePrompt(["prompt"]).valid).toBe(false);
  });

  it("rejects empty or whitespace-only prompts", () => {
    expect(validatePrompt("").valid).toBe(false);
    expect(validatePrompt("   ").valid).toBe(false);
    expect(validatePrompt("\n\t  \n").valid).toBe(false);
  });

  it("rejects prompts exceeding 5000 characters", () => {
    const longPrompt = "a".repeat(5001);
    const result = validatePrompt(longPrompt);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("5000 characters");
  });

  it("accepts valid prompts within the boundary", () => {
    expect(validatePrompt("I had a thoughtful reflection today.").valid).toBe(true);
    expect(validatePrompt("a".repeat(5000)).valid).toBe(true);
  });
});
