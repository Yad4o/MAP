Write-Host ""
Write-Host "  =================================" -ForegroundColor Magenta
Write-Host "   MAP - Starting Frontend Server" -ForegroundColor Magenta
Write-Host "  =================================" -ForegroundColor Magenta
Write-Host ""

Set-Location "$PSScriptRoot\frontend"

if (-not (Test-Path "node_modules")) {
    Write-Host "  [!] node_modules not found. Installing dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host "  [+] Dependencies installed." -ForegroundColor Green
} else {
    Write-Host "  [+] node_modules found." -ForegroundColor Green
}

if (-not (Test-Path ".env.local")) {
    Write-Host "  [!] .env.local not found. Copying from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env.local"
    Write-Host "  [+] .env.local created." -ForegroundColor Green
}

Write-Host ""
Write-Host "  [*] Starting Vite dev server..." -ForegroundColor Yellow
Write-Host "  --> Frontend: http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "  Press CTRL+C to stop." -ForegroundColor Gray
Write-Host ""

npm run dev
