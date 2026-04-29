param(
    [string]$ProjectDir = "C:\Users\david\Documents\CFv1",
    [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$mutexName = "Global\ChefFlowWatchdogSupervisor"
$createdNew = $false
$script:supervisorMutex = New-Object System.Threading.Mutex($true, $mutexName, [ref]$createdNew)
if (-not $createdNew) {
    exit 0
}

Register-EngineEvent PowerShell.Exiting -Action {
    try {
        $script:supervisorMutex.ReleaseMutex()
    } catch {
    }
} | Out-Null

$logDir = Join-Path $ProjectDir 'logs'
$logFile = Join-Path $logDir 'watchdog-supervisor.log'
$stateFile = Join-Path $logDir 'watchdog-supervisor-latest.json'
$watchdogScript = Join-Path $ProjectDir 'chefflow-watchdog.ps1'
$watchdogLauncher = Join-Path $ProjectDir 'scripts\watchdog-launcher.vbs'
$taskName = 'ChefFlow-Watchdog'

if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

if ((Test-Path $logFile) -and (Get-Item $logFile).Length -gt 1MB) {
    Remove-Item "$logFile.old" -ErrorAction SilentlyContinue
    Rename-Item $logFile "$logFile.old" -ErrorAction SilentlyContinue
}

function Write-Log {
    param([string]$Message)
    $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Add-Content -Path $logFile -Value "[$ts] $Message"
}

function Get-WatchdogProcess {
    $scriptNeedle = $watchdogScript.ToLowerInvariant()
    return @(
        Get-CimInstance Win32_Process |
            Where-Object {
                $cmd = [string]$_.CommandLine
                $cmd.ToLowerInvariant().Contains($scriptNeedle) -and
                    -not $cmd.ToLowerInvariant().Contains('watchdog-supervisor.ps1')
            } |
            Select-Object ProcessId, ParentProcessId, Name, CommandLine
    )
}

function Get-TaskSnapshot {
    try {
        $task = Get-ScheduledTask -TaskName $taskName -ErrorAction Stop
        $info = Get-ScheduledTaskInfo -TaskName $taskName -ErrorAction Stop
        return [pscustomobject]@{
            present = $true
            state = [string]$task.State
            lastRunTime = $info.LastRunTime
            lastTaskResult = $info.LastTaskResult
            nextRunTime = $info.NextRunTime
        }
    } catch {
        return [pscustomobject]@{
            present = $false
            state = 'missing'
            lastRunTime = $null
            lastTaskResult = $null
            nextRunTime = $null
        }
    }
}

function Start-Watchdog {
    param([object]$TaskSnapshot)

    if ($DryRun) {
        return 'dry-run'
    }

    if ($TaskSnapshot.present) {
        Start-ScheduledTask -TaskName $taskName -ErrorAction Stop
        return 'started-scheduled-task'
    }

    if (-not (Test-Path $watchdogLauncher)) {
        throw "Watchdog launcher missing at $watchdogLauncher"
    }

    Start-Process `
        -FilePath 'wscript.exe' `
        -ArgumentList "`"$watchdogLauncher`"" `
        -WorkingDirectory $ProjectDir `
        -WindowStyle Hidden `
        -ErrorAction Stop

    return 'started-launcher'
}

$startedAction = 'none'
$errorMessage = $null
$taskSnapshot = Get-TaskSnapshot
$processes = Get-WatchdogProcess

if ($processes.Count -eq 0) {
    try {
        $startedAction = Start-Watchdog -TaskSnapshot $taskSnapshot
        Write-Log "Watchdog was absent. Action=$startedAction TaskState=$($taskSnapshot.state)"
    } catch {
        $startedAction = 'failed'
        $errorMessage = $_.Exception.Message
        Write-Log "Watchdog was absent. Failed to start: $errorMessage"
    }
} else {
    $startedAction = 'already-running'
}

$afterProcesses = Get-WatchdogProcess
$result = [pscustomobject]@{
    checkedAt = (Get-Date).ToUniversalTime().ToString('o')
    dryRun = [bool]$DryRun
    action = $startedAction
    error = $errorMessage
    task = $taskSnapshot
    watchdogProcessCountBefore = $processes.Count
    watchdogProcessCountAfter = $afterProcesses.Count
    watchdogPids = @($afterProcesses | ForEach-Object { $_.ProcessId })
}

$result | ConvertTo-Json -Depth 6 | Set-Content -Path $stateFile

if ($errorMessage) {
    exit 1
}
