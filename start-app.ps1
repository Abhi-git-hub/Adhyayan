# First, make sure any processes on ports 3000 and 3001 are stopped
Write-Host "Checking for processes on ports 3000 and 3001..." -ForegroundColor Cyan
$port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -ErrorAction SilentlyContinue
if ($port3000) {
    Write-Host "Killing process on port 3000..." -ForegroundColor Yellow
    Stop-Process -Id $port3000 -Force -ErrorAction SilentlyContinue
    Write-Host "Process killed" -ForegroundColor Green
} else {
    Write-Host "No process found on port 3000" -ForegroundColor Green
}

$port3001 = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -ErrorAction SilentlyContinue
if ($port3001) {
    Write-Host "Killing process on port 3001..." -ForegroundColor Yellow
    Stop-Process -Id $port3001 -Force -ErrorAction SilentlyContinue
    Write-Host "Process killed" -ForegroundColor Green
} else {
    Write-Host "No process found on port 3001" -ForegroundColor Green
}

# Check if required packages are installed in client
Write-Host "Checking if required npm packages are installed..." -ForegroundColor Cyan
if (-not (Test-Path -Path "$PSScriptRoot\client\node_modules\cross-env")) {
    Write-Host "Installing cross-env package..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-Command `"cd '$PSScriptRoot\client'; npm install cross-env --save-dev`"" -Wait -NoNewWindow
}

if (-not (Test-Path -Path "$PSScriptRoot\client\node_modules\http-proxy-middleware")) {
    Write-Host "Installing http-proxy-middleware package..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-Command `"cd '$PSScriptRoot\client'; npm install http-proxy-middleware --save-dev`"" -Wait -NoNewWindow
}

# Start the server in a new PowerShell window
Write-Host "Starting the server..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit -Command `"cd '$PSScriptRoot'; node server.js`""

# Start the client in a new PowerShell window with '--no-deprecation' flag
Write-Host "Starting the client..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit -Command `"cd '$PSScriptRoot\client'; npm start`""

Write-Host "Application is starting. Check the opened PowerShell windows for output." -ForegroundColor Green 