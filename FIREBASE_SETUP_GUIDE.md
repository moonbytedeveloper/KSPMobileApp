# Firebase Push Notifications Setup Guide (Receive Only)

This guide will help you set up your React Native app to **receive** push notifications from Firebase.

## Prerequisites
- Firebase project created
- Android Studio (for Android setup)
- Xcode (for iOS setup)

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter project name (e.g., "KSP App")
4. Enable Google Analytics (optional)
5. Create the project

## Step 2: Add Android App to Firebase

1. In Firebase Console, click "Add app" and select Android
2. Enter package name: `com.ksp`
3. Enter app nickname: "KSP Android"
4. Download the `google-services.json` file
5. Replace the placeholder file at `android/app/google-services.json` with the downloaded file

## Step 3: Add iOS App to Firebase

1. In Firebase Console, click "Add app" and select iOS
2. Enter bundle ID: `com.ksp`
3. Enter app nickname: "KSP iOS"
4. Download the `GoogleService-Info.plist` file
5. Replace the placeholder file at `ios/ksp/GoogleService-Info.plist` with the downloaded file

## Step 4: Firebase Configuration (Automatic)

✅ **No manual configuration needed!** 

Firebase will automatically use the configuration files you downloaded:
- `android/app/google-services.json` (Android)
- `ios/ksp/GoogleService-Info.plist` (iOS)

The app is already set up to receive notifications automatically.

## Step 5: Android Setup

### Enable Firebase Cloud Messaging
1. In Firebase Console, go to Project Settings
2. Select your Android app
3. Go to "Cloud Messaging" tab
4. Add your server key to your backend (if you have one)

### Build and Test
```bash
cd android
./gradlew clean
cd ..
npx react-native run-android
```

## Step 6: iOS Setup

### Enable Push Notifications
1. In Firebase Console, go to Project Settings
2. Select your iOS app
3. Upload your APNs certificate or key
4. Go to "Cloud Messaging" tab and configure

### Build and Test
```bash
cd ios
pod install
cd ..
npx react-native run-ios
```

## Step 7: Test Notifications

### Using Firebase Console
1. Go to Firebase Console > Cloud Messaging
2. Click "Send your first message"
3. Enter notification title and text
4. Select your app
5. Send the message

### Using FCM Token
The app will log the FCM token to the console. You can use this token to send targeted notifications.

## Step 8: Receiving Notifications

Your app is now ready to receive notifications! Here's what happens:

### Automatic Setup
- ✅ App requests notification permissions on startup
- ✅ FCM token is generated and logged to console
- ✅ App handles notifications in foreground, background, and when closed
- ✅ Notifications can navigate to specific screens

### How Notifications Work
1. **Foreground**: Shows in-app alerts or custom UI
2. **Background**: Shows system notification
3. **App Closed**: Shows system notification, opens app when tapped

### FCM Token Usage
- The FCM token is logged to console when app starts
- Share this token with whoever sends you notifications
- Each device has a unique token

## Troubleshooting

### Android Issues
- Make sure `google-services.json` is in the correct location
- Check that the package name matches
- Ensure Google Services plugin is applied

### iOS Issues
- Make sure `GoogleService-Info.plist` is added to Xcode project
- Check that bundle ID matches
- Ensure push notifications capability is enabled in Xcode

### General Issues
- Check console logs for FCM token
- Verify notification permissions are granted
- Test on physical devices (notifications don't work on simulators)

## Next Steps (Optional Enhancements)

1. **Custom Notification Handling**: Modify `src/services/notificationService.js` to handle specific notification types
2. **Navigation**: Add navigation logic in `handleNotificationPress()` method
3. **Notification Sounds**: Configure custom sounds in notification payload
4. **Badge Count**: Handle notification badges for unread counts
5. **Deep Linking**: Use notification data to navigate to specific app sections

## Useful Commands

```bash
# Clean and rebuild Android
cd android && ./gradlew clean && cd .. && npx react-native run-android

# Clean and rebuild iOS
cd ios && pod install && cd .. && npx react-native run-ios

# Check logs
npx react-native log-android
npx react-native log-ios
```
