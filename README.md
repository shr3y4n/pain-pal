# Secure Cloud Run Application

This document provides step-by-step instructions to configure, secure, and deploy this application to Google Cloud Run, supporting compliance with security rules and campaign verification requirements.

## 1. Environment & Prerequisites

Before deploying, ensure you have enabled the necessary Google Cloud APIs and installed the required SDKs.

1. **Google Cloud Project**: Have a Google Cloud Project created with billing enabled.
2. **Enable APIs**: Enable Cloud Run, Secret Manager, and Firestore in your project:
   ```bash
   gcloud services enable run.googleapis.com secretmanager.googleapis.com firestore.googleapis.com
   ```
3. **Install gcloud CLI**: Install the [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) and authenticate:
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

## 2. Secret Management Setup

Application credentials and API keys must not be hardcoded. Use Google Cloud Secret Manager.

1. **Create and populate the secret** (e.g. for `GEMINI_API_KEY`):
   ```bash
   gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
   echo -n "YOUR_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-
   ```

2. **Grant Access**: Grant the default Cloud Run service account access to read the secret:
   ```bash
   gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
     --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
     --role="roles/secretmanager.secretAccessor"
   ```

## 3. Database Security Configuration

Use Cloud Firestore to store user data. Deploy secure, owner-bound security rules to guarantee data isolation across users.

1. **Initialize Firestore**:
   Create the default Firestore database for your project.
   ```bash
   gcloud firestore databases create --region=YOUR_REGION
   ```

2. **Firestore Security Rules**:
   Ensure `firestore.rules` is configured strictly for owner isolation:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId}/interactions/{interactionId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```
   Deploy these rules using the Firebase CLI:
   ```bash
   firebase deploy --only firestore:rules
   ```

## 4. Cloud Run Deployment Flow

Deploy the application as a container to Cloud Run using the `gcloud` CLI. Ensure you inject the securely stored API key from Secret Manager into the container's environment.

```bash
gcloud run deploy my-secure-app \
  --source . \
  --region=YOUR_REGION \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest"
```

## 5. Required Campaign Labeling

Apply the mandatory resource label to register the service for automated challenge verification:

```bash
gcloud run services update my-secure-app \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=YOUR_REGION
```
