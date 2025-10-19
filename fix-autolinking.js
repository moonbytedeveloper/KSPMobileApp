const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'android/app/build/generated/autolinking/src/main/java/com/facebook/react/ReactNativeApplicationEntryPoint.java');

// Function to fix the file
function fixFile() {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace the old package name with the new one
    content = content.replace(/com\.ksp\.BuildConfig/g, 'com.KspConsults.AndroidApp.BuildConfig');
    
    fs.writeFileSync(filePath, content);
    console.log('Fixed autolinking file with correct package name');
    return true;
  } else {
    console.log('Autolinking file not found, will be created during build');
    return false;
  }
}

// Try to fix the file immediately
fixFile();

// Set up a polling mechanism to continuously check and fix the file
const pollInterval = setInterval(() => {
  if (fixFile()) {
    // File was fixed, continue polling
  }
}, 1000);

// Stop polling after 5 minutes
setTimeout(() => {
  clearInterval(pollInterval);
  console.log('Stopped polling for autolinking file fixes');
}, 300000);
