# Pain-Pal

> **"Your private space to reflect, talk, and understand your thoughts."**

Pain-Pal is a secure, user-authenticated AI journaling and reflection companion developed for the **Google Cloud Run Build & Deploy Social Challenge**. It empowers users to process complex emotions, reflect on daily experiences, and discover constructive insights over time through private, multi-turn AI conversations powered by Google Gemini and Google Cloud infrastructure.

> **Medical & Crisis Notice:** Pain-Pal is an AI reflection and journaling companion. It is **not** a therapist, doctor, clinical diagnostic system, or replacement for professional healthcare or emergency services.

---

## 1. Why Pain-Pal Exists

Modern life brings emotional friction—workplace burnout, relationship transitions, decision fatigue, and quiet stress. While traditional blank-page journaling is valuable, many individuals stare at an empty cursor unsure of where to begin, or feel isolated in their thoughts.

Conversely, seeking advice from general-purpose AI chatbots often introduces serious privacy risks, lack of contextual memory, potential prompt injection, and inadequate crisis safeguards.

**Pain-Pal addresses these challenges by providing:**
1. **Grounded Empathy:** Structured, gentle reflections that mirror feelings without prescribing medical treatments or offering clinical diagnoses.
2. **Deterministic Privacy:** Strict user isolation where journals are cryptographically tied to the authenticated Google UID and cannot be read across accounts.
3. **Safety by Design:** An automated safety-routing safeguard that detects acute crisis before external AI invocation, immediately prioritizing human support.

---

## 2. Core Features

- **Google SSO (Firebase Auth):** Frictionless federated single sign-on via Google (`signInWithPopup`). Zero password handling in custom code.
- **Genuine Multi-Turn Gemini Context:** Maintains conversational history using the official `@google/genai` multi-turn structure (`{ role: "user" | "model", parts: [...] }`) with an automated model fallback ladder.
- **Server-Side Firestore Persistence:** Guaranteed persistence using Firebase Admin SDK on Cloud Run. Conversation turns are authoritatively saved under `users/{userId}/interactions`.
- **Strict Firestore Security Hardening:** Schema-constrained rules enforcing owner-only reads, strict field whitelisting, size limits, and client immutability (`allow update, delete: if false;`).
- **Google Cloud Secret Manager:** Operational API keys are dynamically retrieved in production via `@google-cloud/secret-manager` and cached at startup—zero hardcoded secrets.
- **Pre-AI Safety Routing Layer:** Lightweight server-side classifier that intercepts explicit self-harm or violence statements *before* calling Gemini, returning calm crisis resources and Tele-MANAS/988 hotlines.
- **Prompt Injection Boundaries:** Architectural separation between trusted system instructions and untrusted user narrative text.
- **Thoughtful Journaling UX:** Reflection starter suggestions, multiline editor (Enter to send, Shift+Enter for newline), 5,000-character counter, dynamic model badge, and responsive timeline with auto-scroll.

---

## 3. System Architecture

```mermaid
flowchart TD
    subgraph Client["Client Browser (React + Vite SPA)"]
        UI["Pain-Pal Journal UI"]
        AuthClient["Firebase Auth (Google SSO)"]
        FSClient["Firestore Real-time Listener"]
    end

    subgraph Backend["Google Cloud Run (Express API Service)"]
        AuthMiddleware["Firebase Auth Token Verification\n(getAuth().verifyIdToken())"]
        RateLimiter["Per-User Rate Limiter (20 req/min)"]
        SafetyRouter{"Safety Routing Layer\n(Acute Danger Classifier)"}
        StaticSafety["Verified Crisis Response\n(Tele-MANAS, Kiran, 988, 112)"]
        HistoryLoader["Recent History Loader\n(Last 8 turns)"]
        GeminiService["Gemini Fallback Engine\n(gemini-2.0-flash -> 1.5-flash)"]
        ServerPersistence["Server-Side Admin Persistence\n(Dual Turn Write)"]
    end

    subgraph CloudServices["Google Cloud & Firebase Infrastructure"]
        GCPSecrets["Google Cloud Secret Manager\n(GEMINI_API_KEY)"]
        FirestoreDB[("Cloud Firestore\nusers/{userId}/interactions")]
        GeminiAPI["Google Gemini API Service"]
    end

    %% Client Interactions
    UI -->|1. Sign in with Google| AuthClient
    AuthClient -->|Obtains ID Token| UI
    UI -->|2. POST /api/journal (Bearer JWT)| AuthMiddleware
    FSClient -.->|Real-time Snapshot Sync| FirestoreDB

    %% Backend Flow
    AuthMiddleware --> RateLimiter
    RateLimiter --> SafetyRouter
    SafetyRouter -->|Elevated Danger Detected| StaticSafety
    StaticSafety --> ServerPersistence

    SafetyRouter -->|Normal Reflection| HistoryLoader
    HistoryLoader -->|Query turns| FirestoreDB
    HistoryLoader --> GeminiService
    GCPSecrets -.->|Loaded at bootstrap| GeminiService
    GeminiService -->|Multi-turn generation| GeminiAPI
    GeminiAPI -->|Structured JSON Reflection| ServerPersistence

    ServerPersistence -->|Persist user & model turns| FirestoreDB
    ServerPersistence -->|Return Response to User| UI
```

---

## 4. Security Design

Pain-Pal implements end-to-end security aligned with **OWASP Top 10 (Web)** and **OWASP Top 10 for LLM Applications**:

1. **Server-Authoritative Identity:** The backend never trusts client-supplied identifiers. User identity (`req.user.uid`) is extracted exclusively from cryptographic verification of the Firebase ID token (`verifyIdToken()`).
2. **Owner-Bound Path Checking:** All database reads and writes are strictly scoped to `users/{userId}/interactions/{interactionId}`.
3. **Database Rules Hardening:**
   - Client write rules restrict schema keys to: `['role', 'text', 'createdAt', 'modelUsed', 'mood', 'moodEmoji', 'tags', 'insight', 'safetyRouted']`.
   - `role` must be `'user'` or `'model'`.
   - `text` must not exceed 5,000 characters.
   - Updates and deletions from the client are forbidden (`allow update, delete: if false;`).
   - Default deny on all unmapped collections (`match /{document=**} { allow read, write: if false; }`).
4. **Secret Manager Integration:** Production retrieves API keys via Secret Manager (`projects/{projectId}/secrets/GEMINI_API_KEY/versions/latest`). No API keys or service account keys are stored in code or repository trees.
5. **Prompt Injection Defense:** User reflections are treated as plain, untrusted narrative text. Developer system instructions establish that user messages cannot override safety rules or request credential disclosure.
6. **Input Sanitization & Rate Limiting:** All requests pass through an Express JSON parser limited to 10 KB, followed by length and character validation. An in-memory rate limiter caps each user to 20 requests per minute.
7. **Safe Error Suppression:** All unhandled exceptions and model errors are caught. Clients receive generic, supportive error responses. Stack traces, filesystem paths, and environment dumps are never returned.

---

## 5. Safety Routing Design & Limitations

### How It Works
Before user reflections are forwarded to the Gemini API, the text is evaluated by `classifyPromptSafety()`. The classifier uses explainable linguistic pattern matching designed to differentiate acute crisis from normal emotional processing:

- **Elevated Trigger:** Explicit statements of imminent self-harm (e.g. intent, plans, means) or explicit statements of physical violence toward others.
- **Action Taken:** The prompt is **not** transmitted to Gemini. The server immediately returns a supportive crisis message providing verified hotlines and records the response to the user's timeline.
- **Privacy Minimization:** In accordance with ethical AI privacy principles, dangerous prompt text is **never** duplicated into a secondary surveillance log. Only minimal operational metadata (`{ type: "safety_route", severity: "elevated", createdAt }`) is audited.

### Protected Emotional Space (No False Positives)
Ordinary feelings of sadness, grief, loneliness, anger, and stress are fundamental to personal journaling. Expressions such as *"I had a terrible day"*, *"I feel so lonely"*, or *"I'm angry at my boss"* **never** trigger the crisis routing layer and proceed through regular AI reflection.

### Verified Crisis Helplines Included
- **India:** Tele-MANAS (Govt. of India 24/7 Toll-Free Mental Health Helpline) — `14416` or `1800-891-4416`
- **India:** Kiran Mental Health Helpline — `1800-599-0019`
- **United States & Canada:** 988 Suicide & Crisis Lifeline — `988` (Call or Text)
- **International Emergency Services:** `112` (India / EU / Global) or `911` (US / Canada)

### Limitations
The safety routing layer is a rule-based safeguard intended to promote human support in acute situations. It is **not** an emotional diagnostic system, psychiatric evaluator, or continuous monitoring tool.

---

## 6. Project Structure

```
pain-pal/
├── src/
│   ├── App.tsx                     # Main Pain-Pal React application component
│   ├── main.tsx                    # React DOM root entry
│   ├── index.css                   # Tailwind CSS styling
│   ├── lib/
│   │   └── firebase.ts             # Client Firebase Auth & Firestore initialization
│   └── server/                     # Modular server-side architecture
│       ├── types.ts                # Shared TypeScript interfaces & types
│       ├── middleware/
│       │   └── auth.ts             # Firebase JWT verification & user rate limiting
│       ├── routes/
│       │   └── journal.ts          # POST /api/journal endpoint & payload handling
│       └── services/
│           ├── secrets.ts          # Secret Manager & environment credential loader
│           ├── safety.ts           # Safety routing classifier & crisis resources
│           ├── gemini.ts           # Multi-turn Gemini fallback generation ladder
│           └── firestore.ts        # Admin SDK persistence & user history retrieval
├── tests/
│   ├── safety.test.ts              # Unit tests for acute crisis vs. normal sadness
│   ├── validation.test.ts          # Boundary, payload shape & character limit tests
│   ├── gemini-context.test.ts      # Multi-turn context builder tests
│   └── rate-limit.test.ts          # Per-user rate-limiting tests
├── Dockerfile                      # Multi-stage container definition for Cloud Run
├── .dockerignore                   # Docker build context exclusion list
├── firestore.rules                 # Hardened Firestore Security Rules
├── firestore.indexes.json          # Composite index configuration for queries
├── firebase-applet-config.json     # Firebase client project configuration
├── firebase-blueprint.json         # Entity and collection schema definition
├── metadata.json                   # Cloud Run AI challenge application metadata
├── package.json                    # Project scripts and dependencies
├── tsconfig.json                   # Strict TypeScript compiler configuration
├── vite.config.ts                  # Vite build and development configuration
├── SECURITY.md                     # AI development directives & security policy
└── README.md                       # Comprehensive project documentation
```

---

## 7. Local Development

### Prerequisites
- Node.js 20+ installed
- A Google Cloud Project with Cloud Firestore enabled
- A Gemini API Key from [Google AI Studio](https://aistudio.google.com/)

### Setup Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/shr3y4n/pain-pal.git
   cd pain-pal
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set:
   ```env
   GEMINI_API_KEY="your_actual_gemini_api_key"
   NODE_ENV="development"
   PORT="3000"
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```
   Open **`http://localhost:3000`** in your browser.

---

## 8. Automated Testing & Verification

Pain-Pal includes automated test suites powered by **Vitest**:

```bash
# Run unit tests
npm test

# Run TypeScript typecheck
npm run lint

# Run production build (Vite SPA + esbuild server bundle)
npm run build
```

---

## 9. Google Cloud Run Deployment

### 1. Enable Required GCP APIs
```bash
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  cloudbuild.googleapis.com
```

### 2. Store Gemini Secret in Secret Manager
```bash
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-
```

### 3. Grant Secret Access to Cloud Run Service Account
```bash
PROJECT_NUM=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")

gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUM}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 4. Deploy Firestore Rules & Indexes
```bash
firebase deploy --only firestore:rules,firestore:indexes
```

### 5. Deploy Container to Cloud Run
```bash
gcloud run deploy pain-pal \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest"
```

### 6. Attach Required Social Challenge Label
```bash
gcloud run services update pain-pal \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region us-central1
```

---

## 10. Environment Variables Reference

| Variable | Description | Setting Environment |
|---|---|---|
| `GEMINI_API_KEY` | Google Gemini API key (Required for AI generation) | Local `.env` or Secret Manager in Cloud Run |
| `NODE_ENV` | Runtime mode (`development` or `production`) | Automatically set in container |
| `PORT` | HTTP server listening port (Default: `3000`) | Automatically injected by Cloud Run |
| `GOOGLE_CLOUD_PROJECT` | GCP Project ID | Injected by Cloud Run environment |
| `GEMINI_SECRET_NAME` | Secret name in Secret Manager (Default: `GEMINI_API_KEY`) | Optional override |

---

## 11. Evaluation Checklist

| Criteria | Pain-Pal Implementation | Status |
|---|---|:---:|
| **Authenticity** | Original identity, custom reflection architecture, explainable safety routing layer, starter inspiration tools | ✅ |
| **Usability** | Single Sign-On via Google, multiline shortcuts, prompt restore on error, responsive timeline, character count | ✅ |
| **Stability** | Multi-turn conversation context, Gemini fallback ladder (2.0-flash -> 1.5-flash), dual-turn Admin persistence | ✅ |
| **Security** | Secret Manager integration, owner-bound Firestore RBAC rules, prompt-injection defense, 10 KB body limit | ✅ |
