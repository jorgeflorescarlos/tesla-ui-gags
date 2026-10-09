# Serves this folder on your Wi-Fi so the car's browser can open it.
# Usage:  powershell -ExecutionPolicy Bypass -File serve.ps1 [-Port 8080]
param([int]$Port = 8080)

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$ips = Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' -and $_.PrefixOrigin -ne 'WellKnown' } |
  Select-Object -ExpandProperty IPAddress

Write-Host ""
Write-Host "Tesla UI Gags is running." -ForegroundColor Cyan
Write-Host "  On this PC:   http://localhost:$Port"
foreach ($ip in $ips) { Write-Host "  In the car:   http://${ip}:$Port" -ForegroundColor Green }
Write-Host ""
Write-Host "The car and this PC must be on the same Wi-Fi. If the car can't connect,"
Write-Host "allow Python through Windows Firewall on Private networks (see README)."
Write-Host "Press Ctrl+C to stop."
Write-Host ""

python -m http.server $Port --bind 0.0.0.0 --directory $here
