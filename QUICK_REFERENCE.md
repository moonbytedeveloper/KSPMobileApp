# Universal Links Quick Reference

## 🚀 Critical Steps (Do These First)

### 1. Update Domain Configuration
**Files to update:**
- `src/services/universalLinkService.js` (lines 64-65)
- `android/app/src/main/AndroidManifest.xml` (line 47)
- `ios/ksp/Info.plist` (lines 46, 55)

**Replace `kspapp.com` with your actual domain**

### 2. Create Server Files
**Create these files on your domain:**
- `/.well-known/apple-app-site-association`
- `/.well-known/assetlinks.json`

### 3. Get Required Information
```bash
# Get SHA256 fingerprint for Android
keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android

# Get Apple Team ID from Apple Developer Portal
```

---

## 📁 Server Files Templates

### AASA File (Apple)
```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "YOUR_TEAM_ID.com.ksp.ksp",
        "paths": ["*"]
      }
    ]
  }
}
```

### Asset Links File (Android)
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

---

## 🧪 Quick Testing

### Test URLs
```
https://yourdomain.com/home
https://yourdomain.com/timesheet
yourapp://home
yourapp://timesheet
```

### ADB Commands (Android)
```bash
adb shell am start -W -a android.intent.action.VIEW -d "https://yourdomain.com/home" com.ksp.ksp
```

### iOS Testing
1. Open Safari on physical device
2. Type: `https://yourdomain.com/home`
3. Should show "Open in App" banner

---

## 🔧 Common Fixes

### Universal Links Not Working
1. Check domain in all files
2. Verify server files are accessible
3. Test on physical devices
4. Check Content-Type headers

### Navigation Not Working
1. Update screen names in `universalLinkService.js`
2. Check navigation ref is set
3. Verify screen names match your app

### Server Files Not Accessible
1. Check file permissions
2. Verify server configuration
3. Test with curl commands

---

## 📋 Final Checklist

- [ ] Domain updated in all files
- [ ] Server files created and accessible
- [ ] Screen names updated in navigation map
- [ ] Tested on physical devices
- [ ] Notifications include universal link data
- [ ] Error handling added
- [ ] Logging implemented

---

## 🆘 Emergency Debugging

### Check Server Files
```bash
curl https://yourdomain.com/.well-known/apple-app-site-association
curl https://yourdomain.com/.well-known/assetlinks.json
```

### Check App Configuration
```bash
# Android
adb shell pm query-activities -a android.intent.action.VIEW -d "https://yourdomain.com/home"

# iOS (on device)
# Check Settings > General > About > Apps > Your App
```

### Test Navigation
```javascript
// Add to any screen
import UniversalLinkTest from '../components/UniversalLinkTest';
<UniversalLinkTest />
```

---

## 📞 Support Information

**Key Files:**
- `src/services/universalLinkService.js` - Main logic
- `src/services/notificationService.js` - Notification handling
- `android/app/src/main/AndroidManifest.xml` - Android config
- `ios/ksp/Info.plist` - iOS config

**Test Component:**
- `src/components/UniversalLinkTest.jsx` - Testing interface

**Documentation:**
- `DETAILED_NEXT_STEPS.md` - Complete guide
- `SERVER_FILES_EXAMPLES.md` - Server configuration
- `TESTING_GUIDE.md` - Testing procedures
