# Sentry Secrets Setup for GitHub Actions

To fix the Sentry upload issues in your GitHub Actions workflow, you need to set up the following additional secrets in your GitHub repository.

## Required Sentry Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

### 1. SENTRY_AUTH_TOKEN
- **Value**: Your Sentry authentication token
- **How to get it**:
  1. Go to [Sentry.io](https://sentry.io) and log in
  2. Go to Settings → Auth Tokens
  3. Click "Create New Token"
  4. Give it a name (e.g., "GitHub Actions")
  5. Select the following scopes:
     - `project:read`
     - `project:releases`
     - `org:read`
  6. Copy the generated token

### 2. SENTRY_ORG
- **Value**: Your Sentry organization slug
- **How to find it**:
  1. Go to your Sentry dashboard
  2. Look at the URL: `https://sentry.io/organizations/YOUR_ORG_SLUG/`
  3. The organization slug is the part after `/organizations/`

### 3. SENTRY_PROJECT
- **Value**: Your Sentry project slug
- **How to find it**:
  1. Go to your Sentry project
  2. Look at the URL: `https://sentry.io/organizations/YOUR_ORG/projects/YOUR_PROJECT/`
  3. The project slug is the part after `/projects/`

## Steps to Set Up

1. **Get your Sentry credentials**:
   - Follow the steps above to get your auth token, org slug, and project slug

2. **Add secrets to GitHub**:
   - Go to your repository on GitHub
   - Click on "Settings" tab
   - Click on "Secrets and variables" → "Actions"
   - Click "New repository secret" for each secret above

3. **Test the build**:
   - Push your changes to trigger the GitHub Actions workflow
   - Check the Actions tab to see if the build succeeds

## Optional: Disable Sentry Upload

If you don't want to use Sentry uploads in CI/CD, you can disable it by adding this to your `android/app/build.gradle`:

```gradle
project.ext.sentryCli = [
    logLevel: "debug",
    uploadSourceMaps: false
]
```

## Security Note

- Never commit your Sentry auth token to the repository
- Using GitHub Secrets is the secure way to handle sensitive tokens in CI/CD
- The auth token should have minimal required permissions
