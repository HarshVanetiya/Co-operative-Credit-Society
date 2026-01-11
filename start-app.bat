@echo off
title Bank App Launcher
echo.
echo ========================================
echo        Starting Bank Application
echo ========================================
echo.

:: Start the server in a new window
echo [1/3] Starting Server...
start "Bank Server" cmd /k "cd /d %~dp0server && npm run start"

:: Wait a moment for server to initialize
timeout /t 3 /nobreak > nul

:: Start the client in a new window
echo [2/3] Starting Client...
start "Bank Client" cmd /k "cd /d %~dp0client && npm run dev"

:: Wait for Vite to start
timeout /t 5 /nobreak > nul

:: Open browser with frontend URL
echo [3/3] Opening Browser...
start http://localhost:5173

echo.
echo ========================================
echo    App is running! Close this window
echo    to keep servers running, or press
echo    any key to exit this launcher.
echo ========================================
echo.
pause > nul
