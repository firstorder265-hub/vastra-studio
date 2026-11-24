@echo off
title Vastra Studio - Fashion Channel Local Server
set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "%~dp0"
echo Starting Vastra Studio...
echo   Public Website : http://127.0.0.1:5173/
echo   Admin Portal   : http://127.0.0.1:5173/admin
echo Press Ctrl+C to stop the server.
echo.
npm.cmd run dev -- --host 127.0.0.1 --port 5173
pause
