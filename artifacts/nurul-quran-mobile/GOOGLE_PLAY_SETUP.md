# Google Play Store — Service Account Setup Guide

Follow these steps to enable automatic APK/AAB uploads from EAS.

---

## Step 1 — Create a Service Account in Google Cloud Console

1. Go to: https://console.cloud.google.com
2. Select your project (or create one linked to your Play app)
3. Click **IAM & Admin** → **Service Accounts**
4. Click **Create Service Account**
   - Name: `play-store-deployer`
   - Description: `EAS Submit for Nurul Quran`
5. Click **Create and Continue**
6. Skip the role assignment (we'll do it in Play Console)
7. Click **Done**
8. Click on the service account you just created
9. Go to **Keys** tab → **Add Key** → **Create new key** → **JSON**
10. Download the JSON file — save it as `google-play-service-account.json`

---

## Step 2 — Grant Permissions in Google Play Console

1. Go to: https://play.google.com/console
2. Click **Setup** → **API Access** (left sidebar)
3. Click **Link to a Google Cloud Project** → select your project
4. Under "Service accounts" you should see `play-store-deployer`
5. Click **Grant access** next to it
6. Set permissions:
   - **Release manager** (to upload to tracks)
   - OR **Release to production, exclude devices, and use Play App Signing**
7. Click **Apply**

---

## Step 3 — Place the File in Your Project

```bash
# Place the downloaded JSON file here:
artifacts/nurul-quran-mobile/google-play-service-account.json
```

**IMPORTANT:** This file is already in `.gitignore` — it will NOT be committed.

---

## Step 4 — Test the Connection

```bash
cd artifacts/nurul-quran-mobile
eas submit --platform android --profile production --latest
```

---

## Step 5 — Full Deploy (Build + Auto Submit)

Once everything is set up, one command does everything:

```bash
cd artifacts/nurul-quran-mobile
eas build --platform android --profile production --auto-submit
```

This will:
1. Build a signed AAB using your keystore
2. Upload it automatically to Play Store production track
3. No manual steps needed

---

## Using Your Own Keystore

If you have an existing keystore file from a previous Play Store upload:

1. Copy `credentials.json.template` → `credentials.json`
2. Fill in your keystore details:
   ```json
   {
     "android": {
       "keystore": {
         "keystorePath": "./my-keystore.jks",
         "keystorePassword": "your_password",
         "keyAlias": "your_alias",
         "keyPassword": "your_key_password"
       }
     }
   }
   ```
3. Place your `.jks` file in the `artifacts/nurul-quran-mobile/` folder
4. Both files are in `.gitignore` — they will NOT be committed

---

## Quick Reference

| Command | What it does |
|---|---|
| `pnpm run build:preview` | Build APK for direct install (no Play Store) |
| `pnpm run build:production` | Build signed AAB for Play Store |
| `pnpm run submit:production` | Upload last build to Play Store |
| `pnpm run deploy` | Build + auto-upload in one command |
