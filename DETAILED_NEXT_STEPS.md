# Detailed Next Steps for Universal Links Implementation

## 🎯 Phase 1: Domain Configuration (CRITICAL - Do First)

### Step 1.1: Update Domain in Universal Link Service
**File:** `src/services/universalLinkService.js`
**Action:** Replace placeholder domain with your actual domain

```javascript
// Current (lines 64-65):
const appDomain = 'kspapp.com'; // Replace with your actual domain
const appScheme = 'kspapp'; // Replace with your app scheme

// Update to your actual domain:
const appDomain = 'yourdomain.com'; // e.g., 'mycompany.com'
const appScheme = 'yourapp'; // e.g., 'mycompany' or 'ksp'
```

### Step 1.2: Update Android Manifest
**File:** `android/app/src/main/AndroidManifest.xml`
**Action:** Replace domain in intent filters

```xml
<!-- Current (lines 46-47): -->
<data android:scheme="https"
      android:host="kspapp.com" />

<!-- Update to: -->
<data android:scheme="https"
      android:host="yourdomain.com" />
```

### Step 1.3: Update iOS Info.plist
**File:** `ios/ksp/Info.plist`
**Action:** Replace domain in associated domains

```xml
<!-- Current (line 55): -->
<string>applinks:kspapp.com</string>

<!-- Update to: -->
<string>applinks:yourdomain.com</string>
```

### Step 1.4: Update iOS URL Scheme
**File:** `ios/ksp/Info.plist`
**Action:** Replace URL scheme name

```xml
<!-- Current (line 46): -->
<string>kspapp.com</string>

<!-- Update to: -->
<string>yourdomain.com</string>
```

---

## 🎯 Phase 2: Server Configuration (REQUIRED for Universal Links)

### Step 2.1: Create Apple App Site Association (AASA) File
**File:** `/.well-known/apple-app-site-association` (on your server)
**Action:** Create this file on your domain root

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAMID.com.ksp.ksp",
        "paths": ["*"]
      }
    ]
  }
}
```

**Important Notes:**
- Replace `TEAMID` with your Apple Developer Team ID
- Replace `com.ksp.ksp` with your actual bundle identifier
- File must be served with `Content-Type: application/json`
- File must be accessible at `https://yourdomain.com/.well-known/apple-app-site-association`

### Step 2.2: Create Android Asset Links File
**File:** `/.well-known/assetlinks.json` (on your server)
**Action:** Create this file on your domain root

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.ksp.ksp",
      "sha256_cert_fingerprints": ["YOUR_SHA256_FINGERPRINT"]
    }
  }
]
```

**Important Notes:**
- Replace `com.ksp.ksp` with your actual package name
- Replace `YOUR_SHA256_FINGERPRINT` with your app's SHA256 fingerprint
- File must be accessible at `https://yourdomain.com/.well-known/assetlinks.json`

### Step 2.3: Get Your App's SHA256 Fingerprint
**Command to run:**
```bash
# For debug keystore
keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android

# For release keystore (if you have one)
keytool -list -v -keystore path/to/your/release.keystore -alias your_alias
```

---

## 🎯 Phase 3: Navigation Configuration

### Step 3.1: Update Screen Names in Universal Link Service
**File:** `src/services/universalLinkService.js`
**Action:** Update navigation mapping to match your actual screen names

```javascript
// Current navigation map (lines 75-120):
const navigationMap = {
  '/': 'Home',
  '/home': 'Home',
  '/dashboard': 'Home',
  // ... update these to match your actual screen names
};

// Example updates based on your app structure:
const navigationMap = {
  '/': 'HomeScreen',
  '/home': 'HomeScreen',
  '/dashboard': 'HomeScreen',
  '/timesheet': 'TimesheetScreen',
  '/timesheet/add': 'AddTimesheetScreen',
  '/profile': 'ProfileScreen',
  '/admin': 'AdminDashboardScreen',
  // Add all your actual screen names here
};
```

### Step 3.2: Verify Screen Names in Your Navigation
**Action:** Check your actual screen names in:
- `src/navigation/Stack/AppStack.jsx`
- `src/navigation/BottomTabs/BottomTabs.jsx`
- Any other navigation files

---

## 🎯 Phase 4: Testing Setup

### Step 4.1: Add Test Component to Your App
**File:** Add to any screen (e.g., `src/screens/Home/HomeScreen.jsx`)

```javascript
import UniversalLinkTest from '../../components/UniversalLinkTest';

// Add this to your HomeScreen component for testing
<UniversalLinkTest />
```

### Step 4.2: Test URLs to Try
**Action:** Test these URLs with your app:

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

### Step 4.3: ADB Testing Commands (Android)
**Commands to run:**
```bash
# Test custom scheme
adb shell am start -W -a android.intent.action.VIEW -d "yourapp://home" com.ksp.ksp

# Test HTTPS link
adb shell am start -W -a android.intent.action.VIEW -d "https://yourdomain.com/home" com.ksp.ksp
```

---

## 🎯 Phase 5: Notification Integration

### Step 5.1: Update Notification Sending Logic
**Action:** When sending notifications, include universal link data:

```javascript
// Example Firebase Cloud Messaging payload
const notificationPayload = {
  notification: {
    title: "New Timesheet Entry",
    body: "You have a new timesheet to review"
  },
  data: {
    universalLink: "https://yourdomain.com/timesheet/123",
    // OR
    screen: "TimesheetScreen",
    params: JSON.stringify({ timesheetId: "123", action: "review" })
  }
};
```

### Step 5.2: Test Notification with Universal Links
**Action:** Send a test notification with universal link data and verify navigation works.

---

## 🎯 Phase 6: Error Handling & Logging

### Step 6.1: Add Error Handling to Universal Link Service
**File:** `src/services/universalLinkService.js`
**Action:** Add try-catch blocks and logging

```javascript
// Add this method to the UniversalLinkService class
logUniversalLinkEvent(event, data) {
  console.log(`[Universal Link] ${event}:`, data);
  // You can also send to analytics service here
}
```

### Step 6.2: Add Fallback Navigation
**File:** `src/services/universalLinkService.js`
**Action:** Ensure fallback navigation for unknown routes

```javascript
// In navigateToScreen method, add fallback:
if (targetScreen) {
  this.navigationRef.navigate(targetScreen, params);
} else {
  console.warn('No matching route found for path:', path);
  // Navigate to home as fallback
  this.navigationRef.navigate('HomeScreen');
}
```

---

## 🎯 Phase 7: Production Deployment

### Step 7.1: Verify Server Files
**Action:** Ensure AASA and Asset Links files are accessible:
- `https://yourdomain.com/.well-known/apple-app-site-association`
- `https://yourdomain.com/.well-known/assetlinks.json`

### Step 7.2: Test on Physical Devices
**Action:** Test universal links on real iOS and Android devices (not simulators).

### Step 7.3: Update App Store/Play Store
**Action:** Ensure your app's bundle identifier and package name match the server configuration files.

---

## 🔧 Troubleshooting Checklist

### If Universal Links Don't Work:

1. **Check Domain Configuration**
   - [ ] All files updated with correct domain
   - [ ] No typos in domain names

2. **Check Server Files**
   - [ ] AASA file accessible and valid JSON
   - [ ] Asset Links file accessible and valid JSON
   - [ ] Files served with correct Content-Type

3. **Check App Configuration**
   - [ ] Bundle identifier matches server files
   - [ ] Package name matches server files
   - [ ] SHA256 fingerprint is correct

4. **Check Testing**
   - [ ] Testing on physical devices
   - [ ] URLs are properly formatted
   - [ ] App is installed and can be opened

### Common Issues:

1. **iOS Universal Links Not Working**
   - Verify AASA file is accessible
   - Check associated domains in Info.plist
   - Test on physical device (not simulator)

2. **Android Deep Links Not Working**
   - Verify intent filters in AndroidManifest.xml
   - Check asset links file
   - Test with ADB commands

3. **Navigation Not Working**
   - Check screen names match navigation structure
   - Verify navigation ref is set
   - Check for JavaScript errors in console

---

## 📋 Final Verification Steps

1. **Domain Updated**: ✅ All files use your actual domain
2. **Server Files Created**: ✅ AASA and Asset Links files accessible
3. **Navigation Mapped**: ✅ Screen names match your app structure
4. **Testing Complete**: ✅ Universal links work on physical devices
5. **Notifications Working**: ✅ Notifications navigate to correct screens
6. **Error Handling**: ✅ Fallbacks and logging in place

Once all these steps are completed, your universal links with background notifications will be fully functional!
