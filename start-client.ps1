# Script to start just the client application with proper PowerShell syntax

# First, make sure any processes on port 3001 are stopped
Write-Host "Checking for processes on port 3001..." -ForegroundColor Cyan
$port3001 = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -ErrorAction SilentlyContinue
if ($port3001) {
    Write-Host "Killing process on port 3001..." -ForegroundColor Yellow
    Stop-Process -Id $port3001 -Force -ErrorAction SilentlyContinue
    Write-Host "Process killed" -ForegroundColor Green
} else {
    Write-Host "No process found on port 3001" -ForegroundColor Green
}

# Change to client directory
Set-Location -Path "$PSScriptRoot\client"

# Check if required packages are installed
Write-Host "Checking if required npm packages are installed..." -ForegroundColor Cyan
if (-not (Test-Path -Path "node_modules\cross-env")) {
    Write-Host "Installing cross-env package..." -ForegroundColor Yellow
    npm install cross-env --save-dev
}

if (-not (Test-Path -Path "node_modules\http-proxy-middleware")) {
    Write-Host "Installing http-proxy-middleware package..." -ForegroundColor Yellow
    npm install http-proxy-middleware --save-dev
}

# Start the client (this will use the settings in package.json)
Write-Host "Starting the client application..." -ForegroundColor Cyan
npm start

Write-Host "Client application exited." -ForegroundColor Yellow 