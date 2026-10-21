# SpendSense Development Launcher
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Starting SpendSense Dev Servers" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Launch backend in separate PowerShell window
Write-Host "Starting FastAPI Backend on http://localhost:8000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\..\backend'; .\venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

# Launch frontend in separate PowerShell window
Write-Host "Starting Next.js Frontend on http://localhost:3000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\..\frontend'; npm run dev"

Write-Host "`nBoth services launching in separate windows." -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Yellow
Write-Host "Backend API Docs: http://localhost:8000/docs" -ForegroundColor Yellow
