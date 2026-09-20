<#
PowerShell helper to stop processes started by start-local.ps1.
Reads .dev/pids.json and terminates recorded PIDs.
#>
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
$devDir = Join-Path $root '.dev'
$pidsPath = Join-Path $devDir 'pids.json'
if (-not (Test-Path $pidsPath)) {
    Write-Host "No pids file found at $pidsPath. Nothing to stop."; exit 0
}

try {
    $pids = Get-Content $pidsPath -Raw | ConvertFrom-Json
} catch {
    Write-Error "Failed to read pids.json: $_"; exit 1
}

foreach ($svc in $pids.PSObject.Properties) {
    $name = $svc.Name
    $processId = [int]$svc.Value
    try {
        Stop-Process -Id $processId -Force -ErrorAction Stop
        Write-Host "Stopped $name (PID $processId)"
    } catch {
        Write-Warning "Could not stop $name (PID $processId): $_"
    }
}

# Remove pids file
Remove-Item $pidsPath -ErrorAction SilentlyContinue
Write-Host "Stopped services and removed $pidsPath" 
