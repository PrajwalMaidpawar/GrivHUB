<#
PowerShell helper to start backend and frontend for GrievHUB on Windows.
Creates .dev/pids.json with PIDs so stop-local.ps1 can stop them.
#>
param(
    [int]$BackendPort = 8005,
    [int]$FrontendPort = 3000
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location -Path $root

# Check virtual environment (prefer GrivHUB\venv which has all ML/Django dependencies)
$venvPython = Join-Path $root "GrivHUB\venv\Scripts\python.exe"
if (-not (Test-Path $venvPython)) {
    $venvPython = Join-Path $root ".venv\Scripts\python.exe"
}
if (-not (Test-Path $venvPython)) {
    Write-Host "Virtualenv not found. Creating and installing requirements..."
    python -m venv .venv
    .venv\Scripts\python -m pip install --upgrade pip setuptools wheel
    if (Test-Path "GrivHUB\backend\requirements.txt") {
        .venv\Scripts\python -m pip install -r GrivHUB\backend\requirements.txt
    } elseif (Test-Path "requirements.txt") {
        .venv\Scripts\python -m pip install -r requirements.txt
    }
    $venvPython = Join-Path $root ".venv\Scripts\python.exe"
}

# Ensure .dev directory
$devDir = Join-Path $root ".dev"
if (-not (Test-Path $devDir)) { New-Item -ItemType Directory -Path $devDir | Out-Null }

$pids = @{ }

# Start backend: Django runserver on port $BackendPort
$grivHubDir = Join-Path $root "GrivHUB"
$backendProc = Start-Process -FilePath $venvPython -ArgumentList 'manage.py', 'runserver', "127.0.0.1:$BackendPort", '--noreload' -WorkingDirectory $grivHubDir -PassThru -WindowStyle Hidden
$pids['backend'] = $backendProc.Id
Write-Host "Started backend (PID $($backendProc.Id)) on port $BackendPort"

# Start frontend: Vite dev server on port $FrontendPort
$viteCmd = Join-Path $grivHubDir "node_modules\.bin\vite.cmd"
if (-not (Test-Path $viteCmd)) {
    throw "Vite executable not found at $viteCmd. Run npm install in $grivHubDir."
}
$frontendProc = Start-Process -FilePath $viteCmd -ArgumentList '--port', $FrontendPort.ToString(), '--host', '0.0.0.0' -WorkingDirectory $grivHubDir -PassThru
$pids['frontend'] = $frontendProc.Id
Write-Host "Started frontend (PID $($frontendProc.Id)) on port $FrontendPort"

# Save pids
$pidsPath = Join-Path $devDir 'pids.json'
$pids | ConvertTo-Json | Out-File -FilePath $pidsPath -Encoding utf8
Write-Host "PIDs recorded in $pidsPath"

Write-Host "All services started. Open http://localhost:$FrontendPort for frontend and http://localhost:$BackendPort for backend (API)."
