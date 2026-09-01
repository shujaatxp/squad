<#
.SYNOPSIS
  Sets the current pipeline phase shown on the dashboard's stage tracker.

.DESCRIPTION
  Call this whenever the workflow moves to a new stage (Plan, Build,
  Security Review, Code Review, Test, Docs & DevRel, Shipped). The dashboard
  highlights the current stage and marks earlier ones as completed.

.EXAMPLE
  .\set-phase.ps1 -Stage "Build"
.EXAMPLE
  .\set-phase.ps1 -Stage "Shipped"
#>
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('Plan', 'Build', 'Security Review', 'Code Review', 'Test', 'Docs & DevRel', 'Shipped', 'Reset')]
  [string]$Stage
)

$ErrorActionPreference = 'Stop'

$bridgeUrl = $env:SQUAD_DASHBOARD_BRIDGE_URL
if ([string]::IsNullOrWhiteSpace($bridgeUrl)) {
  $bridgeUrl = 'http://127.0.0.1:8787/event'
}

$body = @{
  type    = 'phase'
  payload = @{
    stage = $Stage
  }
  at      = (Get-Date).ToUniversalTime().ToString('o')
} | ConvertTo-Json -Compress -Depth 8

try {
  Invoke-RestMethod -Uri $bridgeUrl -Method Post -ContentType 'application/json' -Body $body -TimeoutSec 2 | Out-Null
  Write-Host "Pipeline phase set: $Stage"
} catch {
  Write-Warning "Could not reach dashboard bridge at $bridgeUrl. Is it running? (node .\squad-dashboard-bridge\bridge-server.mjs)"
}
