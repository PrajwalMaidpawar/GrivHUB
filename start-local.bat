@echo off
REM Windows batch shim to run the PowerShell start script.
powershell -ExecutionPolicy Bypass -File "%~dp0start-local.ps1" %*
