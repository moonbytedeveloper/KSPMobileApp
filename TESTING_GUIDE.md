# Universal Links Testing Guide

## 🧪 Testing Checklist

### Phase 1: Local Testing (Development)

#### 1.1 Test Universal Link Service
```javascript
// Add this to any screen for testing
import UniversalLinkTest from '../components/UniversalLinkTest';

// In your component:
<UniversalLinkTest />
```

#### 1.2 Test URLs to Try
```
# HTTPS Universal Links
https://yourdomain.com/home
https://yourdomain.com/timesheet
https://yourdomain.com/profile?userId=123

# Custom URL Schemes
yourapp://home
yourapp://timesheet
yourapp://profile?userId=123
```

#### 1.3 Test Navigation Mapping
Verify these screens exist in your app:
- HomeScreen
- TimesheetScreen
- ProfileScreen
- AdminDashboardScreen
- etc.

---

### Phase 2: Android Testing

#### 2.1 ADB Commands (Android)
```bash
# Test custom scheme
adb shell am start -W -a android.intent.action.VIEW -d "yourapp://home" com.ksp.ksp

# Test HTTPS link
adb shell am start -W -a android.intent.action.VIEW -d "https://yourdomain.com/home" com.ksp.ksp

# Test with parameters
adb shell am start -W -a android.intent.action.VIEW -d "https://yourdomain.com/timesheet?userId=123" com.ksp.ksp
```

#### 2.2 Android Browser Testing
1. Open Chrome on Android device
2. Type: `https://yourdomain.com/home`
3. Should prompt to open in your app
4. Tap "Open" and verify navigation

#### 2.3 Android Intent Testing
```bash
# List all activities that can handle a URL
adb shell pm query-activities -a android.intent.action.VIEW -d "https://yourdomain.com/home"

# Test specific intent
adb shell am start -a android.intent.action.VIEW -d "https://yourdomain.com/home" --activity-single-top
```

---

### Phase 3: iOS Testing

#### 3.1 iOS Simulator Testing (Limited)
```bash
# Open iOS Simulator
xcrun simctl openurl booted "https://yourdomain.com/home"

# Test custom scheme
xcrun simctl openurl booted "yourapp://home"
```

#### 3.2 iOS Physical Device Testing (Required)
1. Install app on physical iOS device
2. Open Safari and type: `https://yourdomain.com/home`
3. Should show "Open in [Your App Name]" banner
4. Tap to open and verify navigation

#### 3.3 iOS Notes App Testing
1. Open Notes app on iOS
2. Type: `https://yourdomain.com/home`
3. Tap the link
4. Should open your app

---

### Phase 4: Notification Testing

#### 4.1 Test Notification with Universal Link
```javascript
// Example notification payload
const notificationPayload = {
  notification: {
    title: "Test Notification",
    body: "Tap to test universal link"
  },
  data: {
    universalLink: "https://yourdomain.com/timesheet"
  }
};
```

#### 4.2 Test Notification with Screen Data
```javascript
const notificationPayload = {
  notification: {
    title: "Test Notification",
    body: "Tap to test navigation"
  },
  data: {
    screen: "TimesheetScreen",
    params: JSON.stringify({ userId: "123" })
  }
};
```

#### 4.3 Test Notification with Custom Scheme
```javascript
const notificationPayload = {
  notification: {
    title: "Test Notification",
    body: "Tap to test custom scheme"
  },
  data: {
    deepLink: "yourapp://profile?userId=123"
  }
};
```

---

### Phase 5: Server File Testing

#### 5.1 Test AASA File
```bash
# Test AASA file accessibility
curl -H "Accept: application/json" https://yourdomain.com/.well-known/apple-app-site-association

# Validate JSON
curl -s https://yourdomain.com/.well-known/apple-app-site-association | python -m json.tool
```

#### 5.2 Test Asset Links File
```bash
# Test Asset Links file accessibility
curl -H "Accept: application/json" https://yourdomain.com/.well-known/assetlinks.json

# Validate JSON
curl -s https://yourdomain.com/.well-known/assetlinks.json | python -m json.tool
```

#### 5.3 Test Content-Type Headers
```bash
# Check Content-Type for AASA
curl -I https://yourdomain.com/.well-known/apple-app-site-association

# Check Content-Type for Asset Links
curl -I https://yourdomain.com/.well-known/assetlinks.json
```

---

### Phase 6: End-to-End Testing

#### 6.1 Complete Flow Test
1. **Send Notification**: Send a push notification with universal link data
2. **Tap Notification**: Tap the notification when app is in background
3. **Verify Navigation**: Ensure app opens to correct screen
4. **Check Parameters**: Verify any parameters are passed correctly

#### 6.2 App State Testing
Test universal links in different app states:
- **App Closed**: App should open and navigate to correct screen
- **App Background**: App should come to foreground and navigate
- **App Foreground**: App should navigate to correct screen

#### 6.3 Error Handling Testing
Test with invalid URLs:
- Malformed URLs
- Unknown screen names
- Invalid parameters
- Network errors

---

## 🔧 Debugging Tools

### Android Debugging
```bash
# Check if app can handle URLs
adb shell pm query-activities -a android.intent.action.VIEW -d "https://yourdomain.com/home"

# Check app's intent filters
adb shell dumpsys package com.ksp.ksp | grep -A 10 "android.intent.action.VIEW"

# Monitor logcat for universal link events
adb logcat | grep -i "universal\|deep\|link"
```

### iOS Debugging
```bash
# Check if app is registered for universal links
xcrun simctl listapps | grep -i your-app-name

# Monitor console for universal link events
xcrun simctl spawn booted log stream --predicate 'eventMessage contains "universal"'
```

### React Native Debugging
```javascript
// Add to your universal link service for debugging
console.log('Universal Link Debug:', {
  url: url,
  parsed: parsedUrl,
  navigationRef: !!this.navigationRef,
  timestamp: new Date().toISOString()
});
```

---

## 🚨 Common Issues & Solutions

### Issue 1: "Universal Links Not Working on iOS"
**Symptoms:**
- Links open in Safari instead of app
- No "Open in App" banner appears

**Solutions:**
1. Verify AASA file is accessible via HTTPS
2. Check Content-Type is `application/json`
3. Ensure no redirects on AASA file
4. Test on physical device (not simulator)
5. Check associated domains in Info.plist

### Issue 2: "Android Deep Links Not Working"
**Symptoms:**
- Links don't open app
- "No app can handle this link" error

**Solutions:**
1. Verify intent filters in AndroidManifest.xml
2. Check Asset Links file is accessible
3. Verify SHA256 fingerprint is correct
4. Test with ADB commands
5. Check package name matches exactly

### Issue 3: "Navigation Not Working"
**Symptoms:**
- App opens but doesn't navigate to correct screen
- Navigation errors in console

**Solutions:**
1. Check screen names match navigation structure
2. Verify navigation ref is set
3. Check for JavaScript errors
4. Test navigation mapping manually

### Issue 4: "Server Files Not Accessible"
**Symptoms:**
- 404 errors when accessing AASA/Asset Links files
- Universal links not working

**Solutions:**
1. Check file permissions
2. Verify server configuration
3. Test with curl commands
4. Check for CORS issues

---

## 📋 Testing Checklist

### Pre-Testing Setup
- [ ] Domain updated in all files
- [ ] Server files created and accessible
- [ ] App installed on test devices
- [ ] Test URLs prepared

### Android Testing
- [ ] ADB commands work
- [ ] Browser testing works
- [ ] Intent testing works
- [ ] Notification testing works

### iOS Testing
- [ ] Physical device testing works
- [ ] Safari testing works
- [ ] Notes app testing works
- [ ] Notification testing works

### Server Testing
- [ ] AASA file accessible
- [ ] Asset Links file accessible
- [ ] Content-Type headers correct
- [ ] JSON validation passes

### End-to-End Testing
- [ ] Notification → Navigation flow works
- [ ] Different app states work
- [ ] Error handling works
- [ ] Parameters passed correctly

### Production Readiness
- [ ] All tests pass on physical devices
- [ ] Server files are production-ready
- [ ] Error handling is robust
- [ ] Logging is in place
