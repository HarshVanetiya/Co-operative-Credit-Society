# Bank App Launcher - PowerShell Script
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "       Starting Bank Application       " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Start the server in a new window
Write-Host "[1/3] Starting Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$rootDir\server'; npm run start"

# Wait a moment for server to initialize
Write-Host "      Waiting for server to initialize..." -ForegroundColor Gray
Start-Sleep -Seconds 3

# Start the client in a new window
Write-Host "[2/3] Starting Client..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$rootDir\client'; npm run dev"

# Wait for Vite to start
Write-Host "      Waiting for client to initialize..." -ForegroundColor Gray
Start-Sleep -Seconds 5

# Open browser with frontend URL
Write-Host "[3/3] Opening Browser..." -ForegroundColor Yellow
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "    Bank App is now running!          " -ForegroundColor Green
Write-Host "    Server: http://localhost:3000     " -ForegroundColor White
Write-Host "    Client: http://localhost:5173     " -ForegroundColor White
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Press any key to exit this launcher..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
