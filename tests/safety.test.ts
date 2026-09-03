/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Safety Routing Layer Automated Tests
 */

import { describe, it, expect } from "vitest";
import { classifyPromptSafety, VERIFIED_CRISIS_RESOURCES } from "../src/server/services/safety";

describe("Safety Routing Layer", () => {
  describe("Explicit Imminent Danger & Crisis Detection", () => {
    it("flags explicit suicide and self-harm statements", () => {
      const explicitPrompts = [
        "I want to kill myself tonight",
        "I am going to commit suicide",
        "I want to end my life",
        "I'm planning my suicide note",
        "How to slit my wrists",
        "I wish I were dead and want to die"
      ];

      for (const prompt of explicitPrompts) {
        const result = classifyPromptSafety(prompt);
        expect(result.isElevated).toBe(true);
        expect(result.category).toBe("self_harm");
        expect(result.safetyResponse).toBeDefined();
        expect(result.safetyResponse).toContain("Tele-MANAS");
        expect(result.safetyResponse).toContain("988");
        expect(result.safetyResponse).toContain("112");
      }
    });

    it("flags explicit statements of violence against others", () => {
      const violencePrompts = [
        "I am going to kill someone tomorrow",
        "I want to murder people at my school",
        "Planning to shoot someone"
      ];

      for (const prompt of violencePrompts) {
        const result = classifyPromptSafety(prompt);
        expect(result.isElevated).toBe(true);
        expect(result.category).toBe("violence");
        expect(result.safetyResponse).toBeDefined();
        expect(result.safetyResponse).toContain("Emergency Assistance");
      }
    });
  });

  describe("Negative Emotion Protection (No False Positives)", () => {
    it("does NOT flag ordinary sadness, frustration, or stress", () => {
      const normalJournalPrompts = [
        "I had a terrible day at work today.",
        "I feel awful and just want to sleep.",
        "I'm so angry with my brother for what he said.",
        "I'm sad about the breakup and keep crying.",
        "I hate my current situation, but I hope things get better.",
        "Everything feels difficult right now and I'm stressed.",
        "Work was exhausting and I felt so lonely today.",
        "I feel disappointed in myself for failing the exam."
      ];

      for (const prompt of normalJournalPrompts) {
        const result = classifyPromptSafety(prompt);
        expect(result.isElevated).toBe(false);
        expect(result.safetyResponse).toBeUndefined();
      }
    });

    it("handles empty and edge case inputs gracefully", () => {
      expect(classifyPromptSafety("").isElevated).toBe(false);
      expect(classifyPromptSafety("   ").isElevated).toBe(false);
      expect(classifyPromptSafety(null as any).isElevated).toBe(false);
    });
  });

  describe("Crisis Resources Verification", () => {
    it("contains authoritative and verified crisis contact numbers", () => {
      expect(VERIFIED_CRISIS_RESOURCES.length).toBeGreaterThanOrEqual(3);

      const teleManas = VERIFIED_CRISIS_RESOURCES.find((r) => r.name.includes("Tele-MANAS"));
      expect(teleManas).toBeDefined();
      expect(teleManas?.contact).toContain("14416");

      const kiran = VERIFIED_CRISIS_RESOURCES.find((r) => r.name.includes("Kiran"));
      expect(kiran).toBeDefined();
      expect(kiran?.contact).toContain("1800-599-0019");

      const lifeline988 = VERIFIED_CRISIS_RESOURCES.find((r) => r.contact.includes("988"));
      expect(lifeline988).toBeDefined();

      const emergency = VERIFIED_CRISIS_RESOURCES.find((r) => r.contact.includes("112"));
      expect(emergency).toBeDefined();
    });
  });
});
