<#
.SYNOPSIS
  Announces a visual "handoff" of work between two Squad members on the dashboard.

.DESCRIPTION
  Call this when one member finishes their part and passes the task to
  another (e.g. Developer -> Tester). The dashboard shows an animated ticket
  flying between their two seats before the receiving member's status flips
  to "working" - so handoffs are visible, not just inferred from status text.

.EXAMPLE
  .\send-handoff.ps1 -From developer -To tester -Task "pricing.html"
#>
param(
  [Parameter(Mandatory = $true)]
  [string]$From,

  [Parameter(Mandatory = $true)]
  [string]$To,

  [Parameter(Mandatory = $true)]
  [string]$Task
)

$ErrorActionPreference = 'Stop'

$bridgeUrl = $env:SQUAD_DASHBOARD_BRIDGE_URL
if ([string]::IsNullOrWhiteSpace($bridgeUrl)) {
  $bridgeUrl = 'http://127.0.0.1:8787/event'
}

$body = @{
  type    = 'handoff'
  payload = @{
    from = $From
    to   = $To
    task = $Task
  }
  at      = (Get-Date).ToUniversalTime().ToString('o')
} | ConvertTo-Json -Compress -Depth 8

try {
  Invoke-RestMethod -Uri $bridgeUrl -Method Post -ContentType 'application/json' -Body $body -TimeoutSec 2 | Out-Null
  Write-Host "Handoff announced: $From -> $To ($Task)"
} catch {
  Write-Warning "Could not reach dashboard bridge at $bridgeUrl. Is it running? (node .\squad-dashboard-bridge\bridge-server.mjs)"
}
