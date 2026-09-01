<#
.SYNOPSIS
  Reports a Squad member's live status to the dashboard bridge.

.DESCRIPTION
  Call this any time a squad member (lead, developer, tester, reviewer, etc.)
  starts, finishes, or blocks on a task. The bridge server merges this into
  its in-memory state, and the dashboard (agent-dashboard.html) polls that
  state to show it interactively, in real time, alongside the CLI session.

.EXAMPLE
  .\update-member.ps1 -Name developer -Role Developer -Task "Building sample-page.html" -Status working
  .\update-member.ps1 -Name tester -Role Tester -Task "Smoke testing sample-page.html" -Status working
  .\update-member.ps1 -Name developer -Role Developer -Task "sample-page.html complete" -Status done
#>
param(
  [Parameter(Mandatory = $true)]
  [string]$Name,

  [Parameter(Mandatory = $true)]
  [string]$Role,

  [Parameter(Mandatory = $true)]
  [string]$Task,

  [ValidateSet('working', 'done', 'blocked', 'idle')]
  [string]$Status = 'working'
)

$ErrorActionPreference = 'Stop'

$bridgeUrl = $env:SQUAD_DASHBOARD_BRIDGE_URL
if ([string]::IsNullOrWhiteSpace($bridgeUrl)) {
  $bridgeUrl = 'http://127.0.0.1:8787/event'
}

$body = @{
  type    = 'member_status'
  payload = @{
    name   = $Name
    role   = $Role
    task   = $Task
    status = $Status
  }
  at      = (Get-Date).ToUniversalTime().ToString('o')
} | ConvertTo-Json -Compress -Depth 8

try {
  Invoke-RestMethod -Uri $bridgeUrl -Method Post -ContentType 'application/json' -Body $body -TimeoutSec 2 | Out-Null
  Write-Host "Dashboard updated: $Name ($Role) -> $Status : $Task"
} catch {
  # Dashboard updates are best-effort and must never block Squad work.
  Write-Warning "Could not reach dashboard bridge at $bridgeUrl. Is it running? (node .\squad-dashboard-bridge\bridge-server.mjs)"
}
