# Deploy setup helper — run from project root after cloning.
# Usage: .\scripts\deploy-setup.ps1

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

Write-Host ""
Write-Host "=== Lingua Deploy Setup ===" -ForegroundColor Cyan
Write-Host ""

# 1. EAS login check
Write-Host "[1/4] Checking Expo login..." -ForegroundColor Yellow
$whoami = npx eas-cli whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Not logged in. Run:" -ForegroundColor Red
    Write-Host "  npx eas-cli login" -ForegroundColor White
    Write-Host ""
    $login = Read-Host "Open login now? (y/n)"
    if ($login -eq "y") {
        npx eas-cli login
    } else {
        Write-Host "Login dulu, lalu jalankan script ini lagi." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "  Logged in as: $whoami" -ForegroundColor Green
}

# 2. EAS init if no projectId
Write-Host ""
Write-Host "[2/4] Checking EAS project..." -ForegroundColor Yellow
$config = Get-Content "app.config.js" -Raw
if ($config -notmatch "projectId") {
    Write-Host "  No projectId found. Running eas init..." -ForegroundColor Yellow
    npx eas-cli init
} else {
    Write-Host "  projectId already configured." -ForegroundColor Green
}

# 3. Prompt for env values
Write-Host ""
Write-Host "[3/4] EAS environment variables" -ForegroundColor Yellow
Write-Host "  Isi nilai dari .env lokal Anda. Tekan Enter untuk skip variabel." -ForegroundColor Gray
Write-Host ""

$streamKey = Read-Host "STREAM_API_KEY"
$streamSecret = Read-Host "STREAM_API_SECRET"
$clerkPk = Read-Host "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY"
$agentUrl = Read-Host "VISION_AGENT_URL (Railway URL)"
$apiUrl = Read-Host "EXPO_PUBLIC_API_URL (EAS Hosting URL, set after deploy)"

function Set-EasEnv($name, $value, $envName, $visibility) {
    if ([string]::IsNullOrWhiteSpace($value)) { return }
    Write-Host "  Setting $name for $envName..." -ForegroundColor Gray
    npx eas-cli env:create --name $name --value $value --environment $envName --visibility $visibility --force 2>$null
    if ($LASTEXITCODE -ne 0) {
        npx eas-cli env:update --name $name --value $value --environment $envName --visibility $visibility
    }
}

foreach ($env in @("production", "preview")) {
    Set-EasEnv "STREAM_API_KEY" $streamKey $env "secret"
    Set-EasEnv "STREAM_API_SECRET" $streamSecret $env "secret"
    Set-EasEnv "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY" $clerkPk $env "plaintext"
    Set-EasEnv "VISION_AGENT_URL" $agentUrl $env "secret"
}

if (-not [string]::IsNullOrWhiteSpace($apiUrl)) {
    Set-EasEnv "EXPO_PUBLIC_API_URL" $apiUrl "preview" "plaintext"
}

# 4. Deploy API optional
Write-Host ""
Write-Host "[4/4] Deploy API routes?" -ForegroundColor Yellow
$deploy = Read-Host "Run eas deploy --prod now? (y/n)"
if ($deploy -eq "y") {
    npx eas-cli deploy --prod
    Write-Host ""
    Write-Host "Catat URL EAS Hosting, lalu set EXPO_PUBLIC_API_URL:" -ForegroundColor Cyan
    Write-Host "  npx eas-cli env:create --name EXPO_PUBLIC_API_URL --value https://YOUR-URL.expo.app --environment preview --visibility plaintext --force" -ForegroundColor White
}

Write-Host ""
Write-Host "=== Selesai ===" -ForegroundColor Green
Write-Host "Langkah berikutnya:" -ForegroundColor Cyan
Write-Host "  1. Deploy vision-agent di Railway (lihat DEPLOY_NOW.md Fase A)" -ForegroundColor White
Write-Host "  2. npm run build:android:preview" -ForegroundColor White
Write-Host "  3. Share APK ke tester" -ForegroundColor White
Write-Host ""
Write-Host "Panduan lengkap: DEPLOY_NOW.md" -ForegroundColor Gray
