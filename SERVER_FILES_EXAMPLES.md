# Server Files Examples for Universal Links

## 🍎 Apple App Site Association (AASA) File

**File Path:** `/.well-known/apple-app-site-association`
**Content-Type:** `application/json`
**Must be accessible at:** `https://yourdomain.com/.well-known/apple-app-site-association`

### Example AASA File:

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

### How to Get Your App ID:
1. Go to [Apple Developer Portal](https://developer.apple.com/account/)
2. Navigate to "Certificates, Identifiers & Profiles"
3. Find your app identifier
4. Format: `TEAMID.BUNDLEID` (e.g., `ABCD123456.com.ksp.ksp`)

### Advanced AASA Configuration:

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "ABCD123456.com.ksp.ksp",
        "paths": [
          "/home",
          "/timesheet/*",
          "/profile",
          "/admin/*"
        ]
      }
    ]
  }
}
```

---

## 🤖 Android Asset Links File

**File Path:** `/.well-known/assetlinks.json`
**Content-Type:** `application/json`
**Must be accessible at:** `https://yourdomain.com/.well-known/assetlinks.json`

### Example Asset Links File:

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

### How to Get Your SHA256 Fingerprint:

#### For Debug Keystore (Development):
```bash
keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

#### For Release Keystore (Production):
```bash
keytool -list -v -keystore path/to/your/release.keystore -alias your_alias
```

#### Using Gradle (Alternative):
```bash
cd android
./gradlew signingReport
```

### Multiple Fingerprints (Debug + Release):

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.ksp.ksp",
      "sha256_cert_fingerprints": [
        "14:6D:E9:83:C5:73:06:50:D8:EE:B9:95:2F:34:FC:64:16:A0:83:42:E6:1D:BE:A8:8A:04:96:B2:3F:CF:44:E5",
        "YOUR_RELEASE_FINGERPRINT_HERE"
      ]
    }
  }
]
```

---

## 🌐 Server Configuration Examples

### Nginx Configuration:

```nginx
# Add to your nginx.conf or site configuration
location /.well-known/ {
    add_header Content-Type application/json;
    add_header Access-Control-Allow-Origin *;
}

# Specific files
location /.well-known/apple-app-site-association {
    add_header Content-Type application/json;
    add_header Access-Control-Allow-Origin *;
}

location /.well-known/assetlinks.json {
    add_header Content-Type application/json;
    add_header Access-Control-Allow-Origin *;
}
```

### Apache Configuration:

```apache
# Add to your .htaccess or virtual host
<Files "apple-app-site-association">
    Header set Content-Type "application/json"
    Header set Access-Control-Allow-Origin "*"
</Files>

<Files "assetlinks.json">
    Header set Content-Type "application/json"
    Header set Access-Control-Allow-Origin "*"
</Files>
```

### Express.js (Node.js) Example:

```javascript
const express = require('express');
const app = express();

// Serve AASA file
app.get('/.well-known/apple-app-site-association', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({
    "applinks": {
      "apps": [],
      "details": [
        {
          "appID": "ABCD123456.com.ksp.ksp",
          "paths": ["*"]
        }
      ]
    }
  });
});

// Serve Asset Links file
app.get('/.well-known/assetlinks.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json([
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
  ]);
});
```

---

## 🔍 Verification Commands

### Test AASA File:
```bash
curl -H "Accept: application/json" https://yourdomain.com/.well-known/apple-app-site-association
```

### Test Asset Links File:
```bash
curl -H "Accept: application/json" https://yourdomain.com/.well-known/assetlinks.json
```

### Validate JSON:
```bash
# Test AASA file
curl -s https://yourdomain.com/.well-known/apple-app-site-association | python -m json.tool

# Test Asset Links file
curl -s https://yourdomain.com/.well-known/assetlinks.json | python -m json.tool
```

---

## 🚨 Common Issues & Solutions

### Issue 1: "Universal Links Not Working on iOS"
**Solution:**
- Verify AASA file is accessible via HTTPS
- Check that Content-Type is `application/json`
- Ensure no redirects (301/302) on the AASA file
- Test on physical device, not simulator

### Issue 2: "Android Deep Links Not Working"
**Solution:**
- Verify Asset Links file is accessible
- Check SHA256 fingerprint is correct
- Ensure package name matches exactly
- Test with ADB commands

### Issue 3: "Files Not Accessible"
**Solution:**
- Check server configuration
- Verify file permissions
- Test with curl commands
- Check for CORS issues

### Issue 4: "Wrong Content-Type"
**Solution:**
- Ensure server serves files with `application/json`
- Check for any caching issues
- Clear browser cache and test again

---

## 📋 Checklist for Server Setup

- [ ] AASA file created and accessible
- [ ] Asset Links file created and accessible
- [ ] Both files return `Content-Type: application/json`
- [ ] No redirects on the files
- [ ] Files accessible via HTTPS
- [ ] App ID and package name are correct
- [ ] SHA256 fingerprint is correct
- [ ] Tested with curl commands
- [ ] JSON is valid (no syntax errors)
