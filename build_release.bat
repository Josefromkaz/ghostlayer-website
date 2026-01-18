@echo off
REM ============================================
REM GhostLayer v1.0.0 Release Build Script
REM ============================================

echo.
echo ========================================
echo GhostLayer v1.0.0 Release Build
echo ========================================
echo.

REM Step 1: Clean old builds
echo [1/6] Cleaning old builds...
if exist "dist\GhostLayer_v1.0.0" rmdir /s /q "dist\GhostLayer_v1.0.0"
if exist "build\GhostLayer_v1.0.0" rmdir /s /q "build\GhostLayer_v1.0.0"
if exist "dist\GhostLayer_v1.0.0_Windows_x64.zip" del /q "dist\GhostLayer_v1.0.0_Windows_x64.zip"
echo Done.

REM Step 2: Run PyInstaller
echo.
echo [2/6] Running PyInstaller...
pyinstaller GhostLayer_v1.0.0.spec --noconfirm
if errorlevel 1 (
    echo ERROR: PyInstaller failed!
    pause
    exit /b 1
)
echo Done.

REM Step 3: Verify torch is excluded
echo.
echo [3/6] Verifying torch exclusion...
if exist "dist\GhostLayer_v1.0.0\_internal\torch" (
    echo WARNING: torch folder found! Build may be too large.
) else (
    echo OK: torch excluded successfully.
)

REM Step 4: Calculate SHA-256
echo.
echo [4/6] Calculating SHA-256 hash...
certutil -hashfile "dist\GhostLayer_v1.0.0\GhostLayer_v1.0.0.exe" SHA256 > sha256_temp.txt
type sha256_temp.txt
echo.
echo Copy the hash above and update ghostlayer-landing_4.jsx
echo.

REM Step 5: Create release folder structure
echo [5/6] Creating release folder structure...
if exist "dist\GhostLayer_v1.0.0_Windows_x64" rmdir /s /q "dist\GhostLayer_v1.0.0_Windows_x64"
mkdir "dist\GhostLayer_v1.0.0_Windows_x64"
xcopy "dist\GhostLayer_v1.0.0\*" "dist\GhostLayer_v1.0.0_Windows_x64\" /E /I /Y
copy "LICENSE.txt" "dist\GhostLayer_v1.0.0_Windows_x64\"
copy "RELEASE_NOTES_v1.0.0.md" "dist\GhostLayer_v1.0.0_Windows_x64\README.md"
echo Done.

REM Step 6: Create ZIP archive
echo.
echo [6/6] Creating ZIP archive...
cd dist
powershell Compress-Archive -Path "GhostLayer_v1.0.0_Windows_x64" -DestinationPath "GhostLayer_v1.0.0_Windows_x64.zip" -Force
cd ..
echo Done.

REM Summary
echo.
echo ========================================
echo BUILD COMPLETE!
echo ========================================
echo.
echo Release files:
echo   - dist\GhostLayer_v1.0.0\GhostLayer_v1.0.0.exe
echo   - dist\GhostLayer_v1.0.0_Windows_x64.zip
echo.
echo Next steps:
echo   1. Copy SHA-256 hash from sha256_temp.txt
echo   2. Update ghostlayer-landing_4.jsx with new hash
echo   3. Test exe on clean machine
echo   4. Upload to distribution server
echo.

del sha256_temp.txt 2>nul
pause
