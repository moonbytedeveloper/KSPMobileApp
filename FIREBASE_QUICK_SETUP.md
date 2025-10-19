# 🚀 Quick Firebase Setup (5 Minutes)

## The Error You're Seeing
```
Please set your Application ID. A valid Firebase App ID is required
```

This happens because the `google-services.json` file has placeholder values instead of real Firebase configuration.

## ✅ Quick Fix Steps

### 1. Create Firebase Project (2 minutes)

1. Go to **https://console.firebase.google.com/**
2. Click **"Create a project"**
3. Enter project name: **"KSP App"**
4. Click **"Continue"** → **"Create project"**

### 2. Add Android App (1 minute)

1. Click the **Android icon** 📱
2. **Package name**: `com.ksp`
3. **App nickname**: "KSP Android"
4. Click **"Register app"**
5. **Download** `google-services.json`
6. **Replace** `android/app/google-services.json` with downloaded file

### 3. Add iOS App (1 minute)

1. Click the **iOS icon** 🍎
2. **Bundle ID**: `com.ksp`
3. **App nickname**: "KSP iOS"
4. Click **"Register app"**
5. **Download** `GoogleService-Info.plist`
6. **Replace** `ios/ksp/GoogleService-Info.plist` with downloaded file

### 4. Test (1 minute)

```bash
# Clean and rebuild
cd android; ./gradlew clean; cd ..
npx react-native run-android
```

## 🎯 What You'll See After Setup

✅ **Success**: FCM token will appear in console logs
❌ **Still Error**: Check that files were replaced correctly

## 📱 Testing Notifications

1. **Run the app** and check console for FCM token
2. **Go to Firebase Console** → Cloud Messaging
3. **Click "Send your first message"**
4. **Enter title and message**
5. **Select your app** and send
6. **Notification should appear** on your device

## 🔧 If Still Having Issues

1. **Check file locations**:
   - `android/app/google-services.json` (must be in this exact location)
   - `ios/ksp/GoogleService-Info.plist` (must be in this exact location)

2. **Verify package names**:
   - Android: `com.ksp`
   - iOS: `com.ksp`

3. **Clean rebuild**:
   ```bash
   cd android; ./gradlew clean; cd ..
   npx react-native run-android
   ```

## 📞 Need Help?

The setup is very straightforward - just need to replace the placeholder files with real Firebase configuration files from your Firebase project.
