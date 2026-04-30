param(
  [string]$Url = "http://localhost:3100/admin/v1-builder",
  [ValidateSet("auto", "edge", "chrome", "default")]
  [string]$Browser = "auto",
  [int]$TargetSecondaryIndex = 1
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

Add-Type -AssemblyName System.Windows.Forms

$screens = [System.Windows.Forms.Screen]::AllScreens
$secondaryScreens = @($screens | Where-Object { -not $_.Primary } | Sort-Object { $_.Bounds.X })

if ($secondaryScreens.Count -eq 0) {
  $target = [System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea
} else {
  if ($TargetSecondaryIndex -ge $secondaryScreens.Count) {
    $TargetSecondaryIndex = $secondaryScreens.Count - 1
  }
  if ($TargetSecondaryIndex -lt 0) {
    $TargetSecondaryIndex = 0
  }
  $target = $secondaryScreens[$TargetSecondaryIndex].WorkingArea
}

$browserPath = Resolve-BrowserPath -BrowserChoice $Browser

if (-not $browserPath -or $Browser -eq "default") {
  Start-Process $Url | Out-Null
  Write-Host "Opened Mission Control in the default browser."
  return
}

$arguments = @(
  "--new-window",
  "--app=$Url",
  "--window-position=$($target.X),$($target.Y)",
  "--window-size=$($target.Width),$($target.Height)"
)

$process = Start-Process -FilePath $browserPath -ArgumentList $arguments -PassThru
Write-Host "Opened Mission Control on target monitor with PID $($process.Id)."
