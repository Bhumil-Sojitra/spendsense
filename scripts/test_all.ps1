# SpendSense Verification Suite
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " SpendSense Verification Suite" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$rootDir = Split-Path -Parent $PSScriptRoot

# 1. Backend tests
Write-Host ""
Write-Host "[1/2] Running Backend Pytest Suite..." -ForegroundColor Yellow
Set-Location "$rootDir\backend"
& ".\venv\Scripts\python.exe" -m pytest -v
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Backend tests failed!" -ForegroundColor Red
    Set-Location $rootDir
    exit 1
}
Write-Host ""
Write-Host "Backend tests passed successfully!" -ForegroundColor Green

# 2. Frontend build & typecheck
Write-Host ""
Write-Host "[2/2] Running Frontend Next.js Production Build and Typecheck..." -ForegroundColor Yellow
Set-Location "$rootDir\frontend"
& "cmd.exe" /c "npx next build"
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Frontend build failed!" -ForegroundColor Red
    Set-Location $rootDir
    exit 1
}
Write-Host ""
Write-Host "Frontend build passed successfully!" -ForegroundColor Green

Set-Location $rootDir
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " ALL CHECKS PASSED SUCCESSFULLY" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
