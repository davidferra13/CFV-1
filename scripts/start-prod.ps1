# =============================================================================
# ChefFlow Production Server - Auto-Start Script (Windows)
# =============================================================================
# Starts the production server on port 3300.
# Designed to be run by Windows Task Scheduler on login.
#
# Usage (manual):   pwsh scripts/start-prod.ps1
# Usage (auto):     Task Scheduler > On login > pwsh -File scripts/start-prod.ps1
# =============================================================================

# Hide this window immediately
Add-Type -Name Win32 -Namespace Native -MemberDefinition @'
    [DllImport("kernel32.dll")] public static extern IntPtr GetConsoleWindow();
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
'@
$consoleHwnd = [Native.Win32]::GetConsoleWindow()
if ($consoleHwnd -ne [IntPtr]::Zero) {
    [Native.Win32]::ShowWindow($consoleHwnd, 0) | Out-Null  # 0 = SW_HIDE
}

$ErrorActionPreference = "Stop"
$ProdDir = "C:\Users\david\Documents\CFv1-prod"
$Port = 3300
$LogFile = "$ProdDir\prod-server.log"

# Verify prod directory exists and has a build
if (-not (Test-Path "$ProdDir\.next\BUILD_ID")) {
    Write-Host "ERROR: No production build found at $ProdDir\.next" -ForegroundColor Red
    Write-Host "Run 'bash scripts/deploy-prod.sh' first to create a build." -ForegroundColor Yellow
    exit 1
}

# Kill any existing production server on this port
$existing = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique
if ($existing) {
    foreach ($pid in $existing) {
        Write-Host "Stopping existing process on port $Port (PID: $pid)..." -ForegroundColor Yellow
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 2
}

# Start the production server
Write-Host ""
Write-Host "  ChefFlow Production Server" -ForegroundColor Green
Write-Host "  Port: $Port" -ForegroundColor Green
Write-Host "  Dir:  $ProdDir" -ForegroundColor Green
Write-Host "  Log:  $LogFile" -ForegroundColor Green
Write-Host "  URL:  https://app.cheflowhq.com" -ForegroundColor Green
Write-Host ""

Set-Location $ProdDir

$env:NODE_ENV = "production"
$env:PORT = $Port

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "node"
$psi.Arguments = "`"$ProdDir\node_modules\next\dist\bin\next`" start -p $Port"
$psi.WorkingDirectory = $ProdDir
$psi.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden
$psi.CreateNoWindow = $true
$psi.UseShellExecute = $false
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.EnvironmentVariables["NODE_ENV"] = "production"
$psi.EnvironmentVariables["PORT"] = "$Port"

$proc = [System.Diagnostics.Process]::Start($psi)
Write-Host "Production server started (PID: $($proc.Id))" -ForegroundColor Green

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
