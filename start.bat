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

REM Detect package manager
set PM=npm
where bun >nul 2>&1
if %ERRORLEVEL% EQU 0 set PM=bun
echo Using: %PM%

echo.
echo [1/4] Installing dependencies...
call %PM% install

echo.
echo [2/4] Generating Prisma client...
call %PM% run db:generate

echo.
echo [3/4] Creating database tables...
call %PM% run db:push

echo.
echo [4/4] Seeding demo data...
call %PM% run db:seed

echo.
echo ==========================================
echo   Setup complete!
echo ==========================================
echo.
echo Port:       %PORT%
echo App URL:    %APP_URL%
echo.
echo Demo accounts:
echo   Admin:    admin@shopflar.dev / admin12345
echo   Customer: customer@example.com / customer123
echo.
echo Start with: %PM% run dev
echo Or custom port: set PORT=8080 ^&^& %PM% run dev
echo.
echo Admin panel: %APP_URL%/admin
pause
