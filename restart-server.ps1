# First, make sure any processes on port 3000 are stopped
Write-Host "Checking for processes on port 3000..." -ForegroundColor Cyan
$port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -ErrorAction SilentlyContinue
if ($port3000) {
    Write-Host "Killing process on port 3000..." -ForegroundColor Yellow
    Stop-Process -Id $port3000 -Force -ErrorAction SilentlyContinue
    Write-Host "Process killed" -ForegroundColor Green
} else {
    Write-Host "No process found on port 3000" -ForegroundColor Green
}

# Start the server
Write-Host "Starting the server in the current window..." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
node server.js 