<#
.SYNOPSIS
  Pops up a "thought bubble" for a Squad member on the dashboard.

.DESCRIPTION
  Call this when a member voices an opinion, plan note, security concern,
  or an agree/disagree reaction during discussion. The dashboard shows it
  as a balloon popping up over that member's seat.

.EXAMPLE
  .\send-thought.ps1 -Name security -Role Security -Message "Need input validation on symptom search." -Stance disagree
#>
param(
  [Parameter(Mandatory = $true)]
  [string]$Name,

  [Parameter(Mandatory = $true)]
  [string]$Role,

  [Parameter(Mandatory = $true)]
  [string]$Message,

  [ValidateSet('agree', 'disagree', 'neutral', 'idea')]
  [string]$Stance = 'neutral'
)

$ErrorActionPreference = 'Stop'

$bridgeUrl = $env:SQUAD_DASHBOARD_BRIDGE_URL
if ([string]::IsNullOrWhiteSpace($bridgeUrl)) {
  $bridgeUrl = 'http://127.0.0.1:8787/event'
}

$body = @{
  type    = 'thought'
  payload = @{
    name    = $Name
    role    = $Role
    message = $Message
    stance  = $Stance
  }
  at      = (Get-Date).ToUniversalTime().ToString('o')
} | ConvertTo-Json -Compress -Depth 8

try {
  Invoke-RestMethod -Uri $bridgeUrl -Method Post -ContentType 'application/json' -Body $body -TimeoutSec 2 | Out-Null
  Write-Host "Thought bubble: $Name [$Stance] - $Message"
} catch {
  Write-Warning "Could not reach dashboard bridge at $bridgeUrl. Is it running? (node .\squad-dashboard-bridge\bridge-server.mjs)"
}
