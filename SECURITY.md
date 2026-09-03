# Pain-Pal Security Policy & AI Development Directives

This document defines the technical security baseline, AI development policy, and threat modeling guidelines governing **Pain-Pal**. It serves as the authoritative security directive set for Google AI Studio prompts, human developers, and autonomous coding agents working on this codebase.

---

## 1. Threat Modeling Framework

Prior to introducing or altering any security-sensitive component (authentication, database operations, AI routing, or external APIs), developers and AI agents must evaluate the architecture across the **5 Threat Zones**:

| Threat Zone | Surface in Pain-Pal | Identified Risks | Enforced Countermeasures |
|---|---|---|---|
| **1. Input Surfaces** | User journal text submitted to `POST /api/journal` | Buffer overflow, XSS, malformed payloads, excessive token exhaustion | Top-level JSON body parser limited to 10 KB; strict schema validation; prompt trimmed and capped at 5,000 characters. |
| **2. Planning & Reasoning** | Gemini AI prompt processing | Indirect prompt injection, jailbreaking, jailbreak directives to leak API keys or bypass safety boundaries | Distinct prompt architecture separating trusted system instructions from untrusted user content; system prompt mandates refusing command execution. |
| **3. Tool & AI Execution** | Safety routing layer & Gemini model invocation | Harmful content generation, encouraging self-harm or violence | Explainable server-side safety routing classifier evaluated **before** Gemini; dangerous requests are diverted to static verified crisis responses. |
| **4. Memory & State** | Firestore storage (`users/{userId}/interactions`) | Cross-tenant data leakage, unauthorized reads/writes, arbitrary field injection | Server-authoritative UID derived exclusively from verified Firebase Auth JWT; strict Firestore Security Rules whitelist expected fields, enforce size limits, and disallow client mutation. |
| **5. Inter-System Communication** | Secret Manager, Firebase Auth, Google Gemini API | Credential leakage in logs, hardcoded keys, SSRF | `@google-cloud/secret-manager` fetches keys at startup; zero hardcoded secrets; API keys never returned to frontend or logged. |

---

## 2. Core Engineering Directives

### 2.1 Least Privilege & Server-Authoritative Identity
- **Never trust client-supplied identity**: The frontend must never provide `userId` in request bodies. The backend extracts `req.user.uid` exclusively from verified Firebase ID tokens (`getAuth().verifyIdToken()`).
- **Owner-bound data isolation**: Every user interaction is stored under `users/{userId}/interactions/{interactionId}`. Users have zero read or write access to any path outside their own document namespace.

### 2.2 Secure Secret Management & Zero-Hardcoding
- **Zero hardcoded credentials**: No API keys, service account JSON files, or bearer tokens may be committed to the repository.
- **Production Secret Manager**: In production (`NODE_ENV === "production"`), operational credentials (specifically `GEMINI_API_KEY`) are fetched dynamically from Google Cloud Secret Manager via `@google-cloud/secret-manager`.
- **One-time startup loading**: Secrets are loaded once during server bootstrap and held in memory. Request handlers never perform runtime network roundtrips for credentials.
- **Leakage prevention**: Secrets must never appear in client responses, console error traces, or diagnostic logs.

### 2.3 Strict Firestore Security Rules
- **Zero insecure defaults**: The wildcard rule `match /{document=**} { allow read, write: if false; }` ensures all unmapped routes are denied by default.
- **Schema-validated creation**:
  - `role` must be `'user'` or `'model'`.
  - `text` must be a string between 1 and 5,000 characters.
  - `createdAt` must be a number.
  - Arbitrary fields are strictly rejected using `.keys().hasOnly(...)`.
- **Client immutability**: Journal entries are append-only. `allow update, delete: if false;` prevents tampering from the client.

### 2.4 Prompt Injection Defense & Data Boundaries
- **Clear contextual demarcation**: User journal content is explicitly treated as subjective, untrusted narrative data.
- **Architectural boundary**: The application uses Gemini's dedicated `systemInstruction` field for developer instructions and structured multi-turn `contents` arrays for conversation turns.
- **No secret inclusion**: System instructions and prompt templates must never contain backend credentials, internal infrastructure details, or private URLs.

### 2.5 Privacy Minimization & Safe Logging
- **No storage of dangerous prompts**: The safety routing layer does not store dangerous or crisis text in separate surveillance logs. Minimal operational metadata (`{ type: "safety_route", severity: "elevated", createdAt }`) is persisted for system health auditing.
- **Safe diagnostics**: Console logs may record request outcomes (e.g. `JWT verification rejected: invalid_token`), but must **never** log full user reflections, bearer tokens, or Gemini API keys.
- **Undefined value stripping**: All payloads are cleaned of `undefined` values before Firestore writes to prevent database transaction errors.

### 2.6 Output & Error Sanitization
- **Generic client errors**: Internal errors (Gemini quota limits, network timeouts, Firestore connection failures) return user-friendly, non-technical messages to the frontend.
- **No stack trace exposure**: Server stack traces, filesystem paths, and environment variable dumps are strictly suppressed.

---

## 3. Vulnerability Reporting

If you identify a potential security issue within Pain-Pal, please file a private security report or contact the maintainer directly. Never submit confidential credentials or exploitable payloads to public issue trackers.
