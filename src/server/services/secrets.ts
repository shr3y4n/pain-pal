/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pain-Pal Secret Manager Service
 * Provides secure retrieval of operational credentials via Google Cloud Secret Manager
 * in production, with fallback to environment variables in local development.
 */

import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

let cachedGeminiApiKey: string | null = null;

/**
 * Loads the Gemini API key securely.
 * - In production: Uses SecretManagerServiceClient to fetch the secret from GCP.
 * - In development: Reads from GEMINI_API_KEY environment variable.
 * Caches the result in memory so it is only retrieved once during server startup.
 */
export async function initializeGeminiSecret(): Promise<string> {
  if (cachedGeminiApiKey) {
    return cachedGeminiApiKey;
  }

  // Local development fallback
  if (process.env.NODE_ENV !== "production") {
    const localKey = process.env.GEMINI_API_KEY?.trim();
    if (localKey) {
      cachedGeminiApiKey = localKey;
      return cachedGeminiApiKey;
    }
    console.warn("⚠️  GEMINI_API_KEY not set in development environment variables.");
  }

  // Production: Google Cloud Secret Manager
  try {
    const client = new SecretManagerServiceClient();
    const projectId =
      process.env.GOOGLE_CLOUD_PROJECT ||
      process.env.GCP_PROJECT ||
      (await client.getProjectId());

    const secretName = process.env.GEMINI_SECRET_NAME || "GEMINI_API_KEY";
    const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;

    console.log(`🔒 Accessing secret: projects/${projectId}/secrets/${secretName}/versions/latest`);
    const [version] = await client.accessSecretVersion({ name });
    const payload = version.payload?.data?.toString()?.trim();

    if (!payload) {
      throw new Error(`Secret payload for '${secretName}' was empty.`);
    }

    cachedGeminiApiKey = payload;
    return cachedGeminiApiKey;
  } catch (error: any) {
    // If running in development without Secret Manager credentials, fallback if env is set
    if (process.env.GEMINI_API_KEY?.trim()) {
      console.warn("Secret Manager retrieval failed; falling back to GEMINI_API_KEY env var.");
      cachedGeminiApiKey = process.env.GEMINI_API_KEY.trim();
      return cachedGeminiApiKey;
    }

    const message = `Failed to load Gemini API secret from Secret Manager: ${error?.message || error}`;
    console.error(`❌ ${message}`);
    throw new Error(message);
  }
}

/**
 * Returns the cached Gemini API key without re-fetching on every request.
 */
export function getCachedGeminiSecret(): string {
  if (!cachedGeminiApiKey) {
    throw new Error(
      "Gemini API key has not been initialized. Server startup secret resolution may have failed."
    );
  }
  return cachedGeminiApiKey;
}
