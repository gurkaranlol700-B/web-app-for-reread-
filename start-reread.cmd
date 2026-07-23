@echo off
title ReRead
cd /d C:\Users\Intel\Desktop\claude\reread

rem Already running? Don't start a second copy - just open the site.
netstat -ano | findstr ":3000 " | findstr "LISTENING" >nul
if not errorlevel 1 (
  echo ReRead is already running - opening it in your browser...
  start "" http://localhost:3000
  exit /b 0
)

rem First run (or after "npm run build" was never done): build the optimized site once.
if not exist ".next\BUILD_ID" (
  echo First-time setup: building ReRead. This takes about a minute...
  call npm run build
  if errorlevel 1 (
    echo.
    echo Build failed - see the errors above.
    pause
    exit /b 1
  )
)

echo.
echo  ReRead is starting at  http://localhost:3000
echo  Keep this window open. Close it (or press Ctrl+C) to stop the site.
echo.
start "" http://localhost:3000
call npm start
pause
