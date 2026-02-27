# ============================================
# ChefFlow Watchdog Guardian
# ============================================
# Runs via Task Scheduler every 5 minutes.
# Checks if the watchdog is alive. If not, relaunches it.
# The watchdog has a mutex so duplicates are impossible.

$projectDir = "C:\Users\david\Documents\CFv1"
$logFile = "$projectDir\chefflow-watchdog.log"

function Write-GuardianLog {
    param($msg)
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $logFile -Value "[$ts] [guardian] $msg" -Encoding UTF8
}

# Try to acquire the watchdog mutex -- if we CAN, the watchdog is dead
$mutexName = "Global\ChefFlowWatchdog"
$createdNew = $false
try {
    $testMutex = New-Object System.Threading.Mutex($true, $mutexName, [ref]$createdNew)
    if ($createdNew) {
        # We got the mutex = watchdog is NOT running -- release and relaunch
        $testMutex.ReleaseMutex()
        $testMutex.Dispose()

        Write-GuardianLog "Watchdog is not running -- relaunching..."

        # Launch watchdog directly as hidden PowerShell
        $watchdogPath = Join-Path $projectDir "chefflow-watchdog.ps1"
        $launchArgs = "-WindowStyle Hidden -ExecutionPolicy Bypass -NonInteractive -File `"$watchdogPath`""
        Start-Process "powershell.exe" -ArgumentList $launchArgs -WindowStyle Hidden

        Write-GuardianLog "Watchdog relaunched successfully."
    } else {
        # Mutex already held = watchdog is alive -- nothing to do
        $testMutex.Dispose()
    }
} catch {
    Write-GuardianLog "Guardian check failed: $($_.Exception.Message)"
}
