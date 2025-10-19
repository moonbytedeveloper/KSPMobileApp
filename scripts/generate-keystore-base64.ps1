# PowerShell script to generate base64 encoded keystore for GitHub Secrets
# Run this script from the project root directory

Write-Host "Generating base64 encoded keystore for GitHub Secrets..." -ForegroundColor Green
Write-Host ""

# Check if keystore file exists
$keystorePath = "android/app/ksp-release-key.keystore"
if (-not (Test-Path $keystorePath)) {
    Write-Host "❌ Error: keystore file not found at $keystorePath" -ForegroundColor Red
    Write-Host "Please make sure the keystore file exists in the correct location." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Keystore file found" -ForegroundColor Green
Write-Host ""

# Generate base64 string
Write-Host "Base64 encoded keystore (copy this for KEYSTORE_BASE64 secret):" -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Yellow
$base64String = [Convert]::ToBase64String([IO.File]::ReadAllBytes($keystorePath))
Write-Host $base64String
Write-Host "================================================================" -ForegroundColor Yellow
Write-Host ""

Write-Host "📋 Required GitHub Secrets:" -ForegroundColor Cyan
Write-Host "1. KEYSTORE_BASE64: [Copy the base64 string above]" -ForegroundColor White
Write-Host "2. KEYSTORE_PASSWORD: ksp2025@secure" -ForegroundColor White
Write-Host "3. KEY_ALIAS: ksp-key" -ForegroundColor White
Write-Host "4. KEY_PASSWORD: ksp2025@secure" -ForegroundColor White
Write-Host ""

Write-Host "🔗 Go to: Repository Settings → Secrets and variables → Actions" -ForegroundColor Magenta
Write-Host "Add each secret with the values above." -ForegroundColor Magenta
