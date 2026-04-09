# Nurul Quran — Google Play Store Submission Guide

## Step 1: Create Your Expo Account
1. Go to https://expo.dev
2. Sign up with: waseemkhanjdpr@gmail.com
3. Note your Expo **username** (e.g. `waseemkhanjdpr`)
4. Update `app.json` → change `"owner": "waseemkhanjdpr"` to your actual username

## Step 2: Install EAS CLI on Your Computer
Open a terminal on your computer (not Replit) and run:
```bash
npm install -g eas-cli
eas login
```
Enter your Expo email and password when prompted.

## Step 3: Register App with Expo
```bash
cd artifacts/nurul-quran-mobile
eas project:init
```
This will create a real `projectId` — copy it and update `app.json` → `extra.eas.projectId`.

## Step 4: Build the Android App Bundle (AAB)
```bash
eas build --platform android --profile production
```
- This will take ~10–15 minutes on Expo's cloud servers
- You'll get a download link for the `.aab` file when done
- Download the `.aab` file to your computer

## Step 5: Create App on Google Play Console
1. Go to https://play.google.com/console
2. Register as a developer ($25 one-time fee)
3. Click "Create app"
4. Fill in:
   - **App name**: Nurul Quran
   - **Default language**: English
   - **App or game**: App
   - **Free or paid**: Free
5. Accept policies and create the app

## Step 6: Upload the AAB to Play Console
1. Go to **Release** → **Testing** → **Internal testing**
2. Click "Create new release"
3. Upload your `.aab` file
4. Add release notes: "Initial release of Nurul Quran app"
5. Click "Save" then "Review release"

## Step 7: Fill in Store Listing
- **Short description** (80 chars): Learn Quran, Islamic courses, prayer times & duas
- **Full description**: Nurul Quran is your complete Islamic learning companion...
- **App icon**: Use `assets/images/icon.png`
- **Feature graphic**: 1024x500px image (create in Canva)
- **Screenshots**: Take 2–8 screenshots from your phone

## Package Details
- **Package name**: com.nurulquran.mobile
- **Version**: 1.0.0
- **Target SDK**: 35 (Android 15)
- **Min SDK**: 24 (Android 7.0+)

## Contact
Email: waseemkhanjdpr@gmail.com
Website: www.nurulquran.info
