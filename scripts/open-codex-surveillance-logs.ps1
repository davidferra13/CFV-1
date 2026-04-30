param(
  [int]$X = -960,
  [int]$Y = 2234,
  [int]$Width = 960,
  [int]$Height = 516
)

$ErrorActionPreference = "Continue"
$Host.UI.RawUI.WindowTitle = "Codex Surveillance - Live Status"

Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class WindowTools {
  [DllImport("user32.dll")]
  public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int nWidth, int nHeight, bool bRepaint);
}
"@

Start-Sleep -Milliseconds 500
$process = Get-Process -Id $PID
if ($process.MainWindowHandle -ne 0) {
  [WindowTools]::MoveWindow($process.MainWindowHandle, $X, $Y, $Width, $Height, $true) | Out-Null
}

function Write-Section {
  param([string]$Title)
  Write-Host ""
  Write-Host "[$Title]" -ForegroundColor Cyan
}

function Show-LatestFiles {
  param([string]$Path, [int]$Count = 5)
  if (-not (Test-Path $Path)) {
    Write-Host "$Path missing" -ForegroundColor Yellow
    return
  }
  Get-ChildItem -Path $Path -File |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First $Count Name, LastWriteTime |
    Format-Table -AutoSize
}

while ($true) {
  Clear-Host
  Write-Host "Codex Surveillance - read-only live status" -ForegroundColor Green
  Write-Host (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")

  Write-Section "Branch And Dirty Work"
  git status --short --branch | Select-Object -First 28

  Write-Section "Ports"
  Get-NetTCPConnection -LocalPort 3100,3200,3300,41937,11434 -ErrorAction SilentlyContinue |
    Select-Object LocalPort, State, OwningProcess |
    Sort-Object LocalPort, State |
    Format-Table -AutoSize

  Write-Section "Builder And Mission Control Processes"
  Get-CimInstance Win32_Process |
    Where-Object { $_.CommandLine -match "v1-builder[/\\]watch|launcher[/\\]server|next.*3100|start-server.js" } |
    Select-Object ProcessId, Name, @{ Name = "Command"; Expression = { $_.CommandLine.Substring(0, [Math]::Min(110, $_.CommandLine.Length)) } } |
    Format-Table -AutoSize

  Write-Section "Latest Claims"
  Show-LatestFiles "system/v1-builder/claims" 6

  Write-Section "Latest Receipts"
  Show-LatestFiles "system/v1-builder/receipts" 6

  Write-Section "Blocked Queue Tail"
  if (Test-Path "system/v1-builder/blocked.jsonl") {
    Get-Content "system/v1-builder/blocked.jsonl" -Tail 6
  } else {
    Write-Host "system/v1-builder/blocked.jsonl missing" -ForegroundColor Yellow
  }

  Write-Section "Guardian Log Tail"
  if (Test-Path "logs/live-ops-guardian.log") {
    Get-Content "logs/live-ops-guardian.log" -Tail 8
  } else {
    Write-Host "logs/live-ops-guardian.log missing" -ForegroundColor Yellow
  }

  Start-Sleep -Seconds 5
}
