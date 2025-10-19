# KSP Universal Links Setup for erp.kspconsults.com

## ✅ Domain Configuration Complete

Your domain `erp.kspconsults.com` has been configured in all necessary files:

### Updated Files:
- ✅ `src/services/universalLinkService.js` - Domain updated to `erp.kspconsults.com`
- ✅ `android/app/src/main/AndroidManifest.xml` - Intent filter updated
- ✅ `ios/ksp/Info.plist` - Associated domains updated

---

## 🚀 Next Steps for erp.kspconsults.com

### 1. Get Required Information

#### Get SHA256 Fingerprint (Android):
```bash
keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

#### Get Apple Team ID:
1. Go to [Apple Developer Portal](https://developer.apple.com/account/)
2. Navigate to "Certificates, Identifiers & Profiles"
3. Find your app identifier
4. Note your Team ID (format: `ABCD123456`)

### 2. Create Server Files

#### AASA File (Apple):
**File:** `/.well-known/apple-app-site-association`
**URL:** `https://erp.kspconsults.com/.well-known/apple-app-site-association`

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

#### Asset Links File (Android):
**File:** `/.well-known/assetlinks.json`
**URL:** `https://erp.kspconsults.com/.well-known/assetlinks.json`

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.ksp.ksp",
      "sha256_cert_fingerprints": [
        "YOUR_SHA256_FINGERPRINT_HERE"
      ]
    }
  }
]
```

### 3. Test URLs for Your Domain

#### HTTPS Universal Links:
```
https://erp.kspconsults.com/home
https://erp.kspconsults.com/timesheet
https://erp.kspconsults.com/profile?userId=123
https://erp.kspconsults.com/admin
```

#### Custom URL Schemes:
```
kspapp://home
kspapp://timesheet
kspapp://profile?userId=123
kspapp://admin
```

### 4. Testing Commands

#### Android ADB Testing:
```bash
# Test HTTPS universal link
adb shell am start -W -a android.intent.action.VIEW -d "https://erp.kspconsults.com/home" com.ksp.ksp

# Test custom scheme
adb shell am start -W -a android.intent.action.VIEW -d "kspapp://home" com.ksp.ksp
```

#### iOS Testing:
1. Open Safari on physical iOS device
2. Type: `https://erp.kspconsults.com/home`
3. Should show "Open in [Your App Name]" banner
4. Tap to open and verify navigation

### 5. Notification Examples

#### Notification with Universal Link:
```json
{
  "notification": {
    "title": "New Timesheet Entry",
    "body": "You have a new timesheet to review"
  },
  "data": {
    "universalLink": "https://erp.kspconsults.com/timesheet/123"
  }
}
```

#### Notification with Screen Data:
```json
{
  "notification": {
    "title": "Profile Update",
    "body": "Your profile has been updated"
  },
  "data": {
    "screen": "ProfileScreen",
    "params": "{\"userId\":\"123\",\"action\":\"view\"}"
  }
}
```

### 6. Server Configuration

#### Nginx Configuration:
```nginx
location /.well-known/ {
    add_header Content-Type application/json;
    add_header Access-Control-Allow-Origin *;
}

location /.well-known/apple-app-site-association {
    add_header Content-Type application/json;
    add_header Access-Control-Allow-Origin *;
}

location /.well-known/assetlinks.json {
    add_header Content-Type application/json;
    add_header Access-Control-Allow-Origin *;
}
```

#### Apache Configuration:
```apache
<Files "apple-app-site-association">
    Header set Content-Type "application/json"
    Header set Access-Control-Allow-Origin "*"
</Files>

<Files "assetlinks.json">
    Header set Content-Type "application/json"
    Header set Access-Control-Allow-Origin "*"
</Files>
```

### 7. Verification Commands

#### Test Server Files:
```bash
# Test AASA file
curl -H "Accept: application/json" https://erp.kspconsults.com/.well-known/apple-app-site-association

# Test Asset Links file
curl -H "Accept: application/json" https://erp.kspconsults.com/.well-known/assetlinks.json

# Check Content-Type headers
curl -I https://erp.kspconsults.com/.well-known/apple-app-site-association
curl -I https://erp.kspconsults.com/.well-known/assetlinks.json
```

### 8. Final Checklist

- [ ] Domain updated in all files ✅
- [ ] Get SHA256 fingerprint for Android
- [ ] Get Apple Team ID
- [ ] Create AASA file on server
- [ ] Create Asset Links file on server
- [ ] Test server files are accessible
- [ ] Test universal links on physical devices
- [ ] Test notification integration
- [ ] Update navigation screen names if needed

---

## 🔧 Troubleshooting

### If Universal Links Don't Work:

1. **Check Domain**: Ensure `erp.kspconsults.com` is used consistently
2. **Check Server Files**: Verify files are accessible via HTTPS
3. **Check Content-Type**: Ensure `application/json` is returned
4. **Check App ID**: Verify Team ID and Bundle ID are correct
5. **Check Fingerprint**: Verify SHA256 fingerprint is correct
6. **Test on Physical Devices**: Universal links don't work in simulators

### Common Issues:

- **iOS**: AASA file must be accessible via HTTPS with correct Content-Type
- **Android**: Asset Links file must be accessible with correct fingerprint
- **Navigation**: Screen names must match your app's navigation structure

---

## 📞 Support Files Created

- `apple-app-site-association` - Template for your server
- `assetlinks.json` - Template for your server
- `KSP_DOMAIN_SETUP.md` - This guide
- `DETAILED_NEXT_STEPS.md` - Complete implementation guide
- `TESTING_GUIDE.md` - Testing procedures
- `QUICK_REFERENCE.md` - Quick reference

Your universal links are now configured for `erp.kspconsults.com`! 🎉
