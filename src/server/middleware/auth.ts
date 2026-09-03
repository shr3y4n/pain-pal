/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pain-Pal Authentication Middleware
 * Validates Firebase ID tokens using Firebase Admin SDK.
 * Ensures the authenticated user UID is server-authoritative.
 */

import { Request, Response, NextFunction } from "express";
import { getAuth } from "firebase-admin/auth";
import { AuthenticatedUser } from "../types";

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

// In-memory rate limiting per verified user UID (20 requests per minute)
interface RateLimitEntry {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitEntry>();

export function checkUserRateLimit(uid: string, maxRequests = 20, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(uid);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(uid, { count: 1, resetAt: now + windowMs });
    return true; // allowed
  }

  if (entry.count >= maxRequests) {
    return false; // exceeded
  }

  entry.count++;
  return true;
}

export async function requireFirebaseAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      error: "Authentication required. Please sign in with your Google account."
    });
    return;
  }

  const idToken = authHeader.split("Bearer ")[1]?.trim();
  if (!idToken) {
    res.status(401).json({
      error: "Invalid authentication format. Missing bearer token."
    });
    return;
  }

  try {
    const decodedToken = await getAuth().verifyIdToken(idToken);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name
    };
    next();
  } catch (error: any) {
    // Diagnostic logging without leaking credentials
    console.warn(`JWT verification rejected: ${error?.code || "invalid_token"}`);

    res.status(401).json({
      error: "Authentication session expired or invalid. Please sign in again."
    });
  }
}
