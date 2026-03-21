Write-Host ""
Write-Host "  ================================" -ForegroundColor Cyan
Write-Host "   MAP - Starting Backend Server" -ForegroundColor Cyan
Write-Host "  ================================" -ForegroundColor Cyan
Write-Host ""

Set-Location "$PSScriptRoot\backend"

if (-not (Test-Path "venv\Scripts\Activate.ps1")) {
    Write-Host "  [!] venv not found. Creating with Python 3.11..." -ForegroundColor Yellow
    py -3.11 -m venv venv
    Write-Host "  [+] venv created." -ForegroundColor Green
    Write-Host "  [*] Installing dependencies..." -ForegroundColor Yellow
    & "venv\Scripts\Activate.ps1"
    pip install -r requirements.txt
    Write-Host "  [+] Dependencies installed." -ForegroundColor Green
} else {
    & "venv\Scripts\Activate.ps1"
    Write-Host "  [+] venv activated." -ForegroundColor Green
}

Write-Host ""
Write-Host "  [*] Starting FastAPI server..." -ForegroundColor Yellow
Write-Host "  --> API:    http://localhost:8000" -ForegroundColor White
Write-Host "  --> Docs:   http://localhost:8000/docs" -ForegroundColor White
Write-Host "  --> Health: http://localhost:8000/health" -ForegroundColor White
Write-Host ""
Write-Host "  Press CTRL+C to stop." -ForegroundColor Gray
Write-Host ""

uvicorn app.main:app --reload
