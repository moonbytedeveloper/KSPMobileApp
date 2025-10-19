# GitHub Secrets Setup for Android Build

To fix the keystore signing issue in GitHub Actions, you need to set up the following secrets in your GitHub repository:

## Required Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

### 1. KEYSTORE_BASE64
- **Value**: Base64 encoded content of your `ksp-release-key.keystore` file
- **How to get it**: Run this command in your terminal:
  ```bash
  base64 -i android/app/ksp-release-key.keystore
  ```
- **Copy the entire output** (it will be a long string) and paste it as the secret value

### 2. KEYSTORE_PASSWORD
- **Value**: `ksp2025@secure`
- **Description**: Password for the keystore file

### 3. KEY_ALIAS
- **Value**: `ksp-key`
- **Description**: Alias of the key in the keystore

### 4. KEY_PASSWORD
- **Value**: `ksp2025@secure`
- **Description**: Password for the key

## Steps to Set Up

1. **Generate the base64 keystore**:
   ```bash
   # Navigate to your project root
   cd /path/to/your/KSP/project
   
   # Generate base64 string
   base64 -i android/app/ksp-release-key.keystore
   ```

2. **Add secrets to GitHub**:
   - Go to your repository on GitHub
   - Click on "Settings" tab
   - Click on "Secrets and variables" → "Actions"
   - Click "New repository secret" for each secret above

3. **Test the build**:
   - Push your changes to trigger the GitHub Actions workflow
   - Check the Actions tab to see if the build succeeds

## Alternative: Local Development

For local development, the build.gradle file has been configured to fall back to the local keystore file when the environment variables are not set.

## Security Note

- Never commit your keystore file to the repository
- The keystore file is already in .gitignore (line 34: `*.keystore`)
- Using GitHub Secrets is the secure way to handle sensitive files in CI/CD
