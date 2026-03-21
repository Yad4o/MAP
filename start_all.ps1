Write-Host ""
Write-Host "  ================================" -ForegroundColor Green
Write-Host "   MAP - Starting Everything" -ForegroundColor Green
Write-Host "  ================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Opening backend and frontend in separate windows..." -ForegroundColor Yellow
Write-Host ""

$root = $PSScriptRoot

Start-Process powershell -ArgumentList "-NoExit", "-File", "$root\start_backend.ps1"
Start-Sleep -Seconds 3
Start-Process powershell -ArgumentList "-NoExit", "-File", "$root\start_frontend.ps1"

Write-Host "  [+] Both servers are starting." -ForegroundColor Green
Write-Host ""
Write-Host "  Backend  --> http://localhost:8000" -ForegroundColor Cyan
Write-Host "  Frontend --> http://localhost:5173" -ForegroundColor Magenta
Write-Host "  API Docs --> http://localhost:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "  You can close this window now." -ForegroundColor Gray
Write-Host ""
