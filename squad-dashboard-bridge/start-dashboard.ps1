$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Push-Location $root
try {
  node .\squad-dashboard-bridge\bridge-server.mjs
}
finally {
  Pop-Location
}
