# Nurul Quran — Build Standalone APK / IPA

This app is fully independent from Replit. Once built, it installs directly on Android/iOS and works without any server.

---

## Prerequisites

You need **Node.js** and **npm** installed on your computer.

---

## Step 1 — Install EAS CLI

Open a terminal on your computer and run:

```bash
npm install -g eas-cli
```

---

## Step 2 — Log in to Expo

```bash
eas login
```

Enter your **expo.dev** credentials (username: `waseemkhanjdpr`).

---

## Step 3 — Clone / go to the mobile app folder

```bash
git clone https://github.com/waseemkhanjdpr1902/nurul-quran1.git
cd nurul-quran1/artifacts/nurul-quran-mobile
```

Or if you already have the repo:

```bash
cd path/to/nurul-quran1/artifacts/nurul-quran-mobile
```

---

## Step 4 — Link the project to Expo

```bash
eas init --id nurul-quran-mobile
```

> This will update `app.json` with the real Expo project UUID.
> If it says "project already exists", just press Enter to continue.

---

## Step 5 — Build the Android APK

```bash
eas build --platform android --profile preview
```

- This uploads your code to Expo's build servers (~10–20 minutes)
- No Android Studio needed — Expo does everything in the cloud
- When done, you get a **download link for the APK**

---

## Step 6 — Install the APK

- Download the APK from the link Expo gives you
- Send it to your Android phone (via WhatsApp, email, Google Drive, etc.)
- On the phone: open the APK file → tap **Install** → allow "Unknown sources" if prompted

---

## Optional — iOS Build

For iPhone, you need an **Apple Developer account** ($99/year):

```bash
eas build --platform ios --profile preview
```

Expo will walk you through provisioning profiles automatically.

---

## Quick Reference

| Command | What it does |
|---|---|
| `eas build --platform android --profile preview` | Build APK (shareable, no Play Store needed) |
| `eas build --platform android --profile production` | Build AAB (for Play Store upload) |
| `eas build --platform ios --profile preview` | Build IPA (for TestFlight / direct install) |
| `eas build --platform all --profile preview` | Build Android + iOS at once |

---

## App Details

- **Package:** `com.nurulquran.mobile`
- **Version:** 1.0.0
- **Min Android:** Android 7.0 (SDK 24)
- **Works offline:** Yes — all content is built in
