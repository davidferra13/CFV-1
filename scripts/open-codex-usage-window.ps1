param(
  [ValidateSet("auto", "edge", "chrome", "default")]
  [string]$Browser = "auto",
  [string]$Url = "https://chatgpt.com/codex/settings/usage",
  [switch]$AlwaysOnTop,
  [int]$RetrySeconds = 20
)

$ErrorActionPreference = "Stop"

function Resolve-BrowserPath {
  param([string]$BrowserChoice)

  $edgePaths = @(
    (Join-Path ${env:ProgramFiles(x86)} "Microsoft\Edge\Application\msedge.exe"),
    (Join-Path $env:ProgramFiles "Microsoft\Edge\Application\msedge.exe")
  )

  $chromePaths = @(
    (Join-Path ${env:ProgramFiles(x86)} "Google\Chrome\Application\chrome.exe"),
    (Join-Path $env:ProgramFiles "Google\Chrome\Application\chrome.exe")
  )

  if ($BrowserChoice -eq "edge") {
    return $edgePaths | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
  }

  if ($BrowserChoice -eq "chrome") {
    return $chromePaths | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
  }

  if ($BrowserChoice -eq "auto") {
    $edge = $edgePaths | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
    if ($edge) { return $edge }

    $chrome = $chromePaths | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
    if ($chrome) { return $chrome }
  }

  return $null
}

function Set-WindowTopMost {
  param(
    [int]$ProcessId,
    [string]$ProcessName,
    [int]$TimeoutSeconds
  )

  Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class WindowPin {
  [DllImport("user32.dll", SetLastError=true)]
  public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
}
"@

  $topMost = [IntPtr](-1)
  $flags = 0x0001 -bor 0x0002 -bor 0x0040 # NOSIZE | NOMOVE | SHOWWINDOW

  $deadline = [DateTime]::UtcNow.AddSeconds([Math]::Max($TimeoutSeconds, 5))
  while ([DateTime]::UtcNow -lt $deadline) {
    $target = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
    if (-not $target) {
      $target = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue |
        Where-Object { $_.MainWindowHandle -ne 0 } |
        Sort-Object StartTime -Descending |
        Select-Object -First 1
    }

    if ($target -and $target.MainWindowHandle -ne 0) {
      [void][WindowPin]::SetWindowPos($target.MainWindowHandle, $topMost, 0, 0, 0, 0, $flags)
      Write-Host "Pinned usage window on top."
      return
    }

    Start-Sleep -Milliseconds 500
  }

  Write-Warning "Window opened, but could not pin it top-most within timeout."
}

# Load window placement utility (moves spawned windows to secondary monitor)
$windowPlacementPath = Join-Path $PSScriptRoot "lib\window-placement.ps1"
if (Test-Path $windowPlacementPath) {
  . $windowPlacementPath
  $useWindowPlacement = $true
} else {
  $useWindowPlacement = $false
}

$browserPath = Resolve-BrowserPath -BrowserChoice $Browser

if (-not $browserPath -or $Browser -eq "default") {
  Start-Process $Url | Out-Null
  Write-Host "Opened Codex usage page in your default browser."
  return
}

$browserName = [System.IO.Path]::GetFileNameWithoutExtension($browserPath)

# If we have window placement, use --window-position to open on secondary monitor directly
if ($useWindowPlacement) {
  $monPos = Get-SecondaryMonitorPosition -OffsetX 100 -OffsetY 100
  $arguments = @("--new-window", "--app=$Url", "--window-position=$($monPos.X),$($monPos.Y)")
} else {
  $arguments = @("--new-window", "--app=$Url")
}

$process = Start-Process -FilePath $browserPath -ArgumentList $arguments -PassThru

Write-Host "Opened Codex usage app window with $browserName."

# Move to secondary monitor (backup in case --window-position didn't stick)
if ($useWindowPlacement) {
  Move-ToSecondaryMonitor -ProcessId $process.Id -PreserveSize -TimeoutSeconds 10
}

if ($AlwaysOnTop) {
  Set-WindowTopMost -ProcessId $process.Id -ProcessName $browserName -TimeoutSeconds $RetrySeconds
}
