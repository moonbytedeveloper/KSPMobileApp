# Server Files Setup for erp.kspconsults.com

## 📁 Files to Upload to Your Domain

You need to upload these files to the root of your domain `erp.kspconsults.com`:

### 1. Apple App Site Association (AASA) File
**File Name:** `apple-app-site-association` (NO file extension)
**Location:** `https://erp.kspconsults.com/.well-known/apple-app-site-association`

### 2. Android Asset Links File
**File Name:** `assetlinks.json`
**Location:** `https://erp.kspconsults.com/.well-known/assetlinks.json`

---

## 🔧 Required Information to Update

### For Apple App Site Association (AASA):

#### Get Your Apple Team ID:
1. Go to [Apple Developer Portal](https://developer.apple.com/account/)
2. Navigate to "Certificates, Identifiers & Profiles"
3. Find your app identifier
4. Note your Team ID (format: `ABCD123456`)

#### Update the AASA file:
Replace `YOUR_TEAM_ID` with your actual Apple Team ID:
```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "ABCD123456.com.ksp.ksp",
        "paths": ["*"]
      }
    ]
  }
}
```

### For Android Asset Links:

#### Get Your SHA256 Fingerprint:
Run this command in your project directory:
```bash
keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

Look for the line that says:
```
SHA256: 14:6D:E9:83:C5:73:06:50:D8:EE:B9:95:2F:34:FC:64:16:A0:83:42:E6:1D:BE:A8:8A:04:96:B2:3F:CF:44:E5
```

#### Update the Asset Links file:
Replace `YOUR_SHA256_FINGERPRINT_HERE` with your actual SHA256 fingerprint:
```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.ksp.ksp",
      "sha256_cert_fingerprints": [
        "14:6D:E9:83:C5:73:06:50:D8:EE:B9:95:2F:34:FC:64:16:A0:83:42:E6:1D:BE:A8:8A:04:96:B2:3F:CF:44:E5"
      ]
    }
  }
]
```

---

## 📤 Upload Instructions

### 1. Update the Files:
1. Get your Apple Team ID
2. Get your SHA256 fingerprint
3. Update both files with the correct values

### 2. Upload to Your Server:
1. Upload `apple-app-site-association` to `/.well-known/apple-app-site-association`
2. Upload `assetlinks.json` to `/.well-known/assetlinks.json`

### 3. Verify Upload:
Test that the files are accessible:
```bash
# Test AASA file
curl https://erp.kspconsults.com/.well-known/apple-app-site-association

# Test Asset Links file
curl https://erp.kspconsults.com/.well-known/assetlinks.json
```

---

## ⚠️ Important Notes

### File Requirements:
- **AASA file**: Must have NO file extension
- **Asset Links file**: Must be named exactly `assetlinks.json`
- Both files must be served with `Content-Type: application/json`
- Both files must be accessible via HTTPS
- No redirects (301/302) on these files

### Server Configuration:
Make sure your server serves these files with the correct Content-Type:

#### Nginx:
```nginx
location /.well-known/ {
    add_header Content-Type application/json;
    add_header Access-Control-Allow-Origin *;
}
```

#### Apache:
```apache
<Files "apple-app-site-association">
    Header set Content-Type "application/json"
</Files>
<Files "assetlinks.json">
    Header set Content-Type "application/json"
</Files>
```

---

## 🧪 Testing After Upload

### 1. Test File Accessibility:
```bash
# Test AASA file
curl -I https://erp.kspconsults.com/.well-known/apple-app-site-association

# Test Asset Links file
curl -I https://erp.kspconsults.com/.well-known/assetlinks.json
```

### 2. Test Universal Links:
```bash
# Android testing
adb shell am start -W -a android.intent.action.VIEW -d "https://erp.kspconsults.com/main" com.ksp.ksp

# iOS testing (on physical device)
# Open Safari and type: https://erp.kspconsults.com/main
```

---

## 📋 Checklist

- [ ] Get Apple Team ID
- [ ] Get SHA256 fingerprint
- [ ] Update AASA file with correct Team ID
- [ ] Update Asset Links file with correct fingerprint
- [ ] Upload AASA file to `/.well-known/apple-app-site-association`
- [ ] Upload Asset Links file to `/.well-known/assetlinks.json`
- [ ] Verify files are accessible via HTTPS
- [ ] Test Content-Type headers
- [ ] Test universal links on physical devices

Once you complete these steps, your universal links will be fully functional! 🎉
