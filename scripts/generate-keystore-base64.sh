#!/bin/bash

# Script to generate base64 encoded keystore for GitHub Secrets
# Run this script from the project root directory

echo "Generating base64 encoded keystore for GitHub Secrets..."
echo ""

# Check if keystore file exists
if [ ! -f "android/app/ksp-release-key.keystore" ]; then
    echo "❌ Error: keystore file not found at android/app/ksp-release-key.keystore"
    echo "Please make sure the keystore file exists in the correct location."
    exit 1
fi

echo "✅ Keystore file found"
echo ""

# Generate base64 string
echo "Base64 encoded keystore (copy this for KEYSTORE_BASE64 secret):"
echo "================================================================"
base64 -i android/app/ksp-release-key.keystore
echo ""
echo "================================================================"
echo ""

echo "📋 Required GitHub Secrets:"
echo "1. KEYSTORE_BASE64: [Copy the base64 string above]"
echo "2. KEYSTORE_PASSWORD: ksp2025@secure"
echo "3. KEY_ALIAS: ksp-key"
echo "4. KEY_PASSWORD: ksp2025@secure"
echo ""

echo "🔗 Go to: Repository Settings → Secrets and variables → Actions"
echo "Add each secret with the values above."
