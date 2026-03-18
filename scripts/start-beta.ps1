# =============================================================================
# ChefFlow Beta Server - Auto-Start Script (Windows)
# =============================================================================
# Starts the beta production server on port 3200.
# Designed to be run by Windows Task Scheduler on login.
#
# Usage (manual):   pwsh scripts/start-beta.ps1
# Usage (auto):     Task Scheduler > On login > pwsh -File scripts/start-beta.ps1
# =============================================================================

# Hide this window immediately (no visible popup regardless of how this script is launched)
Add-Type -Name Win32 -Namespace Native -MemberDefinition @'
    [DllImport("kernel32.dll")] public static extern IntPtr GetConsoleWindow();
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
'@
$consoleHwnd = [Native.Win32]::GetConsoleWindow()
if ($consoleHwnd -ne [IntPtr]::Zero) {
    [Native.Win32]::ShowWindow($consoleHwnd, 0) | Out-Null  # 0 = SW_HIDE
}

$ErrorActionPreference = "Stop"
$BetaDir = "C:\Users\david\Documents\CFv1-beta"
$Port = 3200
$LogFile = "$BetaDir\beta-server.log"

# Verify beta directory exists and has a build
if (-not (Test-Path "$BetaDir\.next\BUILD_ID")) {
    Write-Host "ERROR: No beta build found at $BetaDir\.next" -ForegroundColor Red
    Write-Host "Run 'npm run beta:deploy' first to create a build." -ForegroundColor Yellow
    exit 1
}

# Kill any existing beta server on this port
$existing = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique
if ($existing) {
    foreach ($pid in $existing) {
        Write-Host "Stopping existing process on port $Port (PID: $pid)..." -ForegroundColor Yellow
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 2
}

# Start the beta server
Write-Host ""
Write-Host "  ChefFlow Beta Server" -ForegroundColor Cyan
Write-Host "  Port: $Port" -ForegroundColor Cyan
Write-Host "  Dir:  $BetaDir" -ForegroundColor Cyan
Write-Host "  Log:  $LogFile" -ForegroundColor Cyan
Write-Host ""

Set-Location $BetaDir

# Start Next.js production server (hidden - output goes to log file only)
$env:NODE_ENV = "production"
$env:PORT = $Port

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "node"
$psi.Arguments = "`"$BetaDir\node_modules\next\dist\bin\next`" start -p $Port"
$psi.WorkingDirectory = $BetaDir
$psi.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden
$psi.CreateNoWindow = $true
$psi.UseShellExecute = $false
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.EnvironmentVariables["NODE_ENV"] = "production"
$psi.EnvironmentVariables["PORT"] = "$Port"

$proc = [System.Diagnostics.Process]::Start($psi)
Write-Host "Beta server started (PID: $($proc.Id))" -ForegroundColor Green

# Stream output to log file in background
$proc.BeginOutputReadLine()
$proc.BeginErrorReadLine()

Register-ObjectEvent -InputObject $proc -EventName OutputDataReceived -Action {
    if ($EventArgs.Data) { Add-Content -Path $using:LogFile -Value $EventArgs.Data }
} | Out-Null
Register-ObjectEvent -InputObject $proc -EventName ErrorDataReceived -Action {
    if ($EventArgs.Data) { Add-Content -Path $using:LogFile -Value $EventArgs.Data }
} | Out-Null

$proc.WaitForExit()
