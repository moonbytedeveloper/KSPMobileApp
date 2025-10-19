# Universal Links with Background Notifications Guide

This guide explains how to implement universal links in your React Native app with background notifications.

## Overview

Universal links allow your app to handle deep links from notifications, web links, and other apps. When a user taps a notification or clicks a link, your app can navigate to specific screens with parameters.

## Implementation

### 1. Universal Link Service

The `universalLinkService.js` handles all universal link logic:

- **URL Parsing**: Extracts path and parameters from URLs
- **Navigation**: Maps URLs to app screens
- **Link Generation**: Creates shareable universal links

### 2. Notification Integration

The `notificationService.js` has been updated to handle universal links from notifications:

```javascript
// Notification data can include:
{
  data: {
    universalLink: 'https://kspapp.com/timesheet',
    // OR
    deepLink: 'kspapp://timesheet',
    // OR
    screen: 'Timesheet',
    params: { userId: '123' }
  }
}
```

### 3. Platform Configuration

#### Android (AndroidManifest.xml)
```xml
<!-- Deep Link Intent Filter -->
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https" android:host="kspapp.com" />
</intent-filter>

<!-- Custom URL Scheme Intent Filter -->
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="kspapp" />
</intent-filter>
```

#### iOS (Info.plist)
```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLName</key>
        <string>kspapp.com</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>kspapp</string>
        </array>
    </dict>
</array>
<key>com.apple.developer.associated-domains</key>
<array>
    <string>applinks:kspapp.com</string>
</array>
```

## Usage Examples

### 1. Sending Notifications with Universal Links

When sending push notifications, include universal link data:

```javascript
// Firebase Cloud Messaging payload
{
  "notification": {
    "title": "New Timesheet Entry",
    "body": "You have a new timesheet to review"
  },
  "data": {
    "universalLink": "https://kspapp.com/timesheet/123",
    "screen": "Timesheet",
    "params": "{\"timesheetId\":\"123\",\"action\":\"review\"}"
  }
}
```

### 2. Supported URL Formats

#### HTTPS Universal Links
- `https://kspapp.com/home`
- `https://kspapp.com/timesheet/123`
- `https://kspapp.com/profile?userId=456`

#### Custom URL Schemes
- `kspapp://home`
- `kspapp://timesheet/123`
- `kspapp://profile?userId=456`

### 3. Navigation Mapping

The service maps URLs to app screens:

```javascript
const navigationMap = {
  '/': 'Home',
  '/home': 'Home',
  '/dashboard': 'Home',
  '/timesheet': 'Timesheet',
  '/timesheet/add': 'AddTimesheet',
  '/profile': 'Profile',
  '/admin': 'AdminDashboard',
  // ... more mappings
};
```

### 4. Testing Universal Links

Use the `UniversalLinkTest` component to test your implementation:

```javascript
import UniversalLinkTest from '../components/UniversalLinkTest';

// Add to your app for testing
<UniversalLinkTest />
```

## Server-Side Configuration

### 1. Apple App Site Association (AASA)

Create `/.well-known/apple-app-site-association` on your domain:

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

### 2. Android Asset Links

Create `/.well-known/assetlinks.json` on your domain:

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

## Notification Payload Examples

### 1. Simple Navigation
```json
{
  "notification": {
    "title": "Welcome!",
    "body": "Tap to go to your dashboard"
  },
  "data": {
    "screen": "Home"
  }
}
```

### 2. Deep Link with Parameters
```json
{
  "notification": {
    "title": "Timesheet Reminder",
    "body": "You have pending timesheets"
  },
  "data": {
    "universalLink": "https://kspapp.com/timesheet?filter=pending&userId=123"
  }
}
```

### 3. Custom Scheme
```json
{
  "notification": {
    "title": "Profile Update",
    "body": "Your profile has been updated"
  },
  "data": {
    "deepLink": "kspapp://profile?userId=123&action=view"
  }
}
```

## Troubleshooting

### 1. Links Not Working
- Check URL format and domain configuration
- Verify platform-specific configurations
- Test with the UniversalLinkTest component

### 2. Navigation Issues
- Ensure navigation ref is properly set
- Check screen names match your navigation structure
- Verify parameters are correctly parsed

### 3. iOS Universal Links
- Verify AASA file is accessible
- Check associated domains configuration
- Test on physical device (not simulator)

### 4. Android Deep Links
- Verify intent filters in AndroidManifest.xml
- Check asset links file
- Test with ADB commands

## ADB Testing Commands

```bash
# Test custom scheme
adb shell am start -W -a android.intent.action.VIEW -d "kspapp://home" com.ksp.ksp

# Test HTTPS link
adb shell am start -W -a android.intent.action.VIEW -d "https://kspapp.com/home" com.ksp.ksp
```

## Best Practices

1. **Always provide fallback navigation** for unknown URLs
2. **Use HTTPS universal links** for better security
3. **Include relevant parameters** in notification data
4. **Test on both platforms** before deployment
5. **Handle edge cases** like malformed URLs
6. **Log navigation events** for debugging

## Security Considerations

1. **Validate URL parameters** before navigation
2. **Sanitize user input** in notification data
3. **Use HTTPS** for universal links
4. **Implement proper authentication** for sensitive screens
5. **Log security events** for monitoring

This implementation provides a robust foundation for universal links with background notifications in your React Native app.
