param(
  [Parameter(Mandatory = $true)]
  [string]$Type
)

$ErrorActionPreference = 'Stop'
$bridgeUrl = $env:SQUAD_DASHBOARD_BRIDGE_URL
if ([string]::IsNullOrWhiteSpace($bridgeUrl)) {
  $bridgeUrl = 'http://127.0.0.1:8787/event'
}

try {
  $stdin = [Console]::In.ReadToEnd()
  $inputEvent = $null
  if (-not [string]::IsNullOrWhiteSpace($stdin)) {
    $inputEvent = $stdin | ConvertFrom-Json
  }

  $prompt = 'Copilot CLI session'
  if ($inputEvent -and $inputEvent.prompt) {
    $prompt = [string]$inputEvent.prompt
  }
  elseif ($inputEvent -and $inputEvent.initialPrompt) {
    $prompt = [string]$inputEvent.initialPrompt
  }
  elseif ($inputEvent -and $inputEvent.initial_prompt) {
    $prompt = [string]$inputEvent.initial_prompt
  }

  $updates = @()
  switch ($Type) {
    'sessionStart' {
      $updates += @{ type = 'plugin_loaded'; payload = @{ prompt = $prompt } }
    }
    'userPromptSubmitted' {
      $updates += @{ type = 'prompt'; payload = @{ prompt = $prompt } }
      $updates += @{ type = 'turn_start'; payload = @{ prompt = $prompt } }
    }
    'agentStop' {
      $updates += @{ type = 'turn_end'; payload = @{ prompt = $prompt } }
    }
    'sessionEnd' {
      $updates += @{ type = 'turn_end'; payload = @{ prompt = $prompt } }
    }
  }

  foreach ($item in $updates) {
    $body = ($item + @{ at = (Get-Date).ToUniversalTime().ToString('o') }) | ConvertTo-Json -Compress -Depth 8
    Invoke-RestMethod -Uri $bridgeUrl -Method Post -ContentType 'application/json' -Body $body -TimeoutSec 2 | Out-Null
  }
} catch {
  # Dashboard updates are best-effort and must never block Copilot CLI.
}
