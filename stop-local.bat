@echo off
REM Windows batch shim to run the PowerShell stop script.
powershell -ExecutionPolicy Bypass -File "%~dp0stop-local.ps1" %*
