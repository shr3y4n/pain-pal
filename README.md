# PainPal — AI-Powered Mental Wellness Journal

PainPal is a secure, user-authenticated AI journaling application that lets users privately record reflections and receive empathetic, structured AI responses via Google Gemini. Built with React + Vite (frontend), Express (backend), Firebase Auth + Firestore (auth/database), and deployed to Google Cloud Run.

## ✨ Features

| Feature | Description |
|---|---|
| **Google Sign-In (SSO)** | Firebase Auth with Google provider — no passwords stored |
| **Structured AI Responses** | Gemini returns mood classification, auto-tags, one-line insights, and a full reflection |
| **Wellness Insights Dashboard** | Live stats: total entries, today's count, day streak, top mood |
| **Dynamic Model Badge** | Shows which Gemini model actually responded (fallback ladder in action) |
| **Character Counter** | Visual limit indicator (5 000-char cap) |
| **Dual Persistence** | Server-side Admin SDK write + client-side Firestore fallback |
| **Rate Limiting** | 20 requests/minute per user (server-side) |
| **Gemini Fallback Ladder** | `gemini-2.0-flash` → `gemini-1.5-flash` → `gemini-1.5-flash-8b` → `gemini-1.0-pro` |

---

## 1. Environment & Prerequisites

```bash
# Enable required Google Cloud APIs
gcloud services enable run.googleapis.com secretmanager.googleapis.com firestore.googleapis.com

# Authenticate
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

Install the [Firebase CLI](https://firebase.google.com/docs/cli) and [gcloud CLI](https://cloud.google.com/sdk/docs/install).

---

## 2. Secret Management

API keys and tokens are **never hardcoded**. Store them in Google Cloud Secret Manager:

```bash
# Create the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Grant Cloud Run's service account access
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

For local development, copy `.env.example` to `.env` and populate it:
```bash
cp .env.example .env
# Edit .env and set GEMINI_API_KEY=your_key_here
```

---

## 3. Firebase & Firestore Setup

### 3a. Firestore Security Rules

Deploy the owner-bound rules from `firestore.rules`:
```bash
firebase deploy --only firestore:rules
```

The rules enforce strict isolation — users can only read/write their own data:
```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /{document=**} {
      allow read, write: if false; // deny all other paths
    }
  }
}
```

### 3b. Firestore Indexes

Deploy the composite index required for the `orderBy("createdAt", "desc")` query:
```bash
firebase deploy --only firestore:indexes
```

---

## 4. Local Development

```bash
npm install
npm run dev   # starts Express + Vite on http://localhost:3000
```

---

## 5. Cloud Run Deployment

Build and push the Docker image, then deploy with the secret injected at runtime:

```bash
# Build and push (replace YOUR_PROJECT_ID and YOUR_REGION)
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/pain-pal

# Deploy to Cloud Run
gcloud run deploy pain-pal \
  --image gcr.io/YOUR_PROJECT_ID/pain-pal \
  --region YOUR_REGION \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest"
```

Alternatively, use source-based deployment (Cloud Build handles the Dockerfile automatically):

```bash
gcloud run deploy pain-pal \
  --source . \
  --region YOUR_REGION \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest"
```

---

## 6. Required Campaign Label

Apply the mandatory label for challenge verification:

```bash
gcloud run services update pain-pal \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region YOUR_REGION
```

---

## 7. Architecture

```
Browser (React + Vite)
  │  Google Sign-In (Firebase Auth)
  │  Real-time Firestore listener (owner-scoped)
  │
  ▼
Express Server (Cloud Run)
  │  verifyFirebaseToken middleware (Firebase Admin SDK)
  │  Input validation (length, type)
  │  Per-user rate limiting
  │
  ├─► Google Gemini API (gemini-2.0-flash → fallback ladder)
  │     Structured JSON: reflection + mood + tags + insight
  │
  └─► Firestore Admin (server-side write — guaranteed persistence)
        /users/{uid}/interactions/{id}
```

---

## 8. Security Hardening Checklist

- [x] Google Sign-In only (no password handling)
- [x] JWT verified server-side on every protected endpoint
- [x] Firestore rules: owner-bound paths (`request.auth.uid == userId`)
- [x] All other Firestore paths explicitly denied
- [x] `GEMINI_API_KEY` sourced from environment / Secret Manager
- [x] Input length capped at 5 000 characters
- [x] Rate limiting: 20 requests/minute per authenticated user
- [x] `undefined` values stripped before Firestore writes
- [x] Indirect prompt injection defense: user input treated as plain data

---

## 9. Functional Walkthrough Tests

### Test 1 — Authentication
1. Open app → "Authentication Required" screen with Google Sign-In button
2. Click "Sign in with Google" → Google OAuth popup
3. Authenticate → Redirected back; "PainPal" header shows user context, form enabled

### Test 2 — Journal Entry (Happy Path)
1. Type a reflection (e.g., "I've been feeling overwhelmed at work lately")
2. Click Send → spinner appears, textarea cleared immediately (no debug strings)
3. AI response card appears with: mood badge, reflection text, insight, tags
4. Model badge in header updates to show actual Gemini model used

### Test 3 — Persistence & Real-time Sync
1. Submit an entry, note its timestamp
2. Hard-refresh the browser
3. Entry reappears — confirms Firestore real-time sync and server-side persistence

### Test 4 — Security Controls
1. `curl -X POST http://localhost:3000/api/journal` (no auth header) → `401`
2. `curl -X POST` with invalid Bearer token → `401`
3. Submit 5001+ character prompt → `400` with descriptive error shown in UI

### Test 5 — Fallback Resilience
1. With `GEMINI_API_KEY` unset → UI shows clear error "GEMINI_API_KEY environment variable is required"
2. All models time out → UI shows descriptive error, prompt text restored in textarea

### Test 6 — Docker / Cloud Run
```bash
docker build -t pain-pal .
docker run -p 3000:3000 -e GEMINI_API_KEY=your_key pain-pal
# App accessible at http://localhost:3000
```
