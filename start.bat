@echo off
REM ==========================================
REM   Shopflar - Quick Start (Windows)
REM ==========================================
REM
REM   Customize via environment variables:
REM     set PORT=8080
REM     set APP_URL=https://shop.local
REM     start.bat

REM Resolve port with default
if "%PORT%"=="" set PORT=3000
echo Port: %PORT%

REM Auto-set APP_URL if not provided
if "%APP_URL%"=="" set APP_URL=http://localhost:%PORT%
if "%NEXT_PUBLIC_APP_URL%"=="" set NEXT_PUBLIC_APP_URL=%APP_URL%
echo App URL: %APP_URL%

REM Run setup
echo.
echo Running setup...
call node scripts/setup.js
if %ERRORLEVEL% NEQ 0 (
  echo Setup failed.
  pause
  exit /b 1
)

REM Detect package manager
set PM=npm
where bun >nul 2>&1
if %ERRORLEVEL% EQU 0 set PM=bun

echo.
echo Starting dev server on port %PORT%...
call %PM% run dev
pause
