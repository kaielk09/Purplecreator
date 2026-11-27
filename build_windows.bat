@echo off
setlocal
cd /d %~dp0
echo === Purple Creator Studio - EXE builder ===
python --version || goto no_python
python -m pip install -r requirements-desktop.txt
python -m PyInstaller --noconfirm --clean --windowed --name PurpleCreatorStudio --onefile desktop_app.py
if errorlevel 1 goto build_failed
echo.
echo EXE created at: dist\PurpleCreatorStudio.exe
pause
exit /b 0
:no_python
echo Python is not installed or not on PATH. Install Python 3.11+ and enable Add to PATH.pause
exit /b 1
:build_failedecho EXE build failed. Review the error above.pause
exit /b 1
