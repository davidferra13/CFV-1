param(
  [ValidateSet("init", "write", "watch")]
  [string]$Action = "watch",
  [string]$Message
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$logsDir = Join-Path $root "logs"
$logFile = Join-Path $logsDir "ACTIVITY_LOG.md"

function Ensure-LogFile {
  if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir | Out-Null
  }

  if (-not (Test-Path $logFile)) {
    $content = @"
# Codex Activity Log

This file is the local, human-readable progress stream for Codex work in this workspace.

Watch it live in PowerShell:

```powershell
Get-Content .\logs\ACTIVITY_LOG.md -Wait
```

Recent entries:

- $(Get-Date -Format 'yyyy-MM-dd HH:mm'): Activity log created.
"@
    Set-Content -Path $logFile -Value $content
  }
}

function Add-LogEntry {
  param([string]$EntryMessage)

  if ([string]::IsNullOrWhiteSpace($EntryMessage)) {
    throw "Message is required when Action is 'write'."
  }

  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
  Add-Content -Path $logFile -Value "- $timestamp`: $EntryMessage"
}

Ensure-LogFile

switch ($Action) {
  "init" {
    Write-Host "Activity log ready at $logFile"
  }
  "write" {
    Add-LogEntry -EntryMessage $Message
    Write-Host "Appended activity entry to $logFile"
  }
  "watch" {
    Write-Host "Watching $logFile"
    Get-Content -Path $logFile -Wait
  }
}
