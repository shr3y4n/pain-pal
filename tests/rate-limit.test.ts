/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * User Rate Limiter Unit Tests
 */

import { describe, it, expect } from "vitest";
import { checkUserRateLimit } from "../src/server/middleware/auth";

describe("User Rate Limiting", () => {
  it("permits requests under the configured threshold", () => {
    const testUid = "user-under-limit";
    for (let i = 0; i < 5; i++) {
      expect(checkUserRateLimit(testUid, 10, 60_000)).toBe(true);
    }
  });

  it("blocks requests that exceed the configured threshold within the window", () => {
    const testUid = "user-over-limit";
    const maxRequests = 3;

    // First 3 should pass
    expect(checkUserRateLimit(testUid, maxRequests, 60_000)).toBe(true);
    expect(checkUserRateLimit(testUid, maxRequests, 60_000)).toBe(true);
    expect(checkUserRateLimit(testUid, maxRequests, 60_000)).toBe(true);

    // 4th request must be rejected
    expect(checkUserRateLimit(testUid, maxRequests, 60_000)).toBe(false);
  });
});
