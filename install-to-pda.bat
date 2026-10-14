@echo off
setlocal
set "ADB=D:\android-sdk\platform-tools\adb.exe"
set "APK=%~dp0HB-PDA-v1.0.apk"

echo ============================================
echo   HB-PDA  APK Installer
echo ============================================
echo.

REM Prefer the root APK; fall back to the Gradle build output
if not exist "%APK%" set "APK=%~dp0android\app\build\outputs\apk\release\app-release.apk"
if not exist "%APK%" (
    echo [ERROR] APK not found. Build it first.
    pause
    exit /b 1
)

"%ADB%" get-state >nul 2>&1
if errorlevel 1 (
    echo [ERROR] No PDA detected via USB.
    echo         - Plug in the USB cable
    echo         - Make sure USB debugging is ON and authorized on the PDA
    pause
    exit /b 1
)

echo Device connected. Installing:
echo   %APK%
echo.
"%ADB%" install -r "%APK%"
if errorlevel 1 (
    echo.
    echo [ERROR] Install failed - see message above.
) else (
    echo.
    echo [OK] Installed successfully! Check the PDA for the HB-PDA icon.
)
echo.
pause
