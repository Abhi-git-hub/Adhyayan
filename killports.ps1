# Stop processes on port 3000 (server)
$port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -ErrorAction SilentlyContinue
if ($port3000) {
    Write-Host "Killing process on port 3000..." -ForegroundColor Yellow
    Stop-Process -Id $port3000 -Force -ErrorAction SilentlyContinue
    Write-Host "Process killed" -ForegroundColor Green
} else {
    Write-Host "No process found on port 3000" -ForegroundColor Green
}

# Stop processes on port 3001 (client)
$port3001 = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -ErrorAction SilentlyContinue
if ($port3001) {
    Write-Host "Killing process on port 3001..." -ForegroundColor Yellow
    Stop-Process -Id $port3001 -Force -ErrorAction SilentlyContinue
    Write-Host "Process killed" -ForegroundColor Green
} else {
    Write-Host "No process found on port 3001" -ForegroundColor Green
}

Write-Host "All ports are free now" -ForegroundColor Cyan 