$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$currentUser = "$env:USERDOMAIN\$env:USERNAME"

$watchdogSettings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Seconds 0) `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1)

$watchdogAction = New-ScheduledTaskAction `
    -Execute 'wscript.exe' `
    -Argument "`"$projectRoot\scripts\watchdog-launcher.vbs`"" `
    -WorkingDirectory $projectRoot

$watchdogStartupTrigger = New-ScheduledTaskTrigger -AtStartup
$watchdogStartupTrigger.Delay = 'PT45S'
$watchdogLogonTrigger = New-ScheduledTaskTrigger -AtLogOn -User $currentUser
$watchdogLogonTrigger.Delay = 'PT15S'

$watchdogMode = 'startup + logon'

try {
    Register-ScheduledTask `
        -TaskName 'ChefFlow-Watchdog' `
        -Action $watchdogAction `
        -Trigger @($watchdogStartupTrigger, $watchdogLogonTrigger) `
        -Settings $watchdogSettings `
        -Description 'Boot/logon supervisor for Docker, PostgreSQL, Ollama, prod, dev, beta, Cloudflare tunnels, and Mission Control backend.' `
        -Force `
        -ErrorAction Stop | Out-Null
} catch {
    $existingWatchdog = Get-ScheduledTask -TaskName 'ChefFlow-Watchdog' -ErrorAction SilentlyContinue
    if ($existingWatchdog -and $_.Exception.Message -like '*Access is denied*') {
        Write-Warning 'Could not elevate the existing ChefFlow-Watchdog task to include an AtStartup trigger from this shell. Keeping the existing logon task in place.'
        $watchdogMode = 'existing logon task retained'
    } elseif (-not $existingWatchdog -and $_.Exception.Message -like '*Access is denied*') {
        Register-ScheduledTask `
            -TaskName 'ChefFlow-Watchdog' `
            -Action $watchdogAction `
            -Trigger $watchdogLogonTrigger `
            -Settings $watchdogSettings `
            -Description 'Logon supervisor for Docker, PostgreSQL, Ollama, prod, dev, beta, Cloudflare tunnels, and Mission Control backend.' `
            -Force `
            -ErrorAction Stop | Out-Null
        $watchdogMode = 'logon fallback'
    } else {
        throw
    }
}

$trayAction = New-ScheduledTaskAction `
    -Execute 'wscript.exe' `
    -Argument "`"$projectRoot\scripts\launcher\tray-launcher.vbs`"" `
    -WorkingDirectory $projectRoot

$trayLogonTrigger = New-ScheduledTaskTrigger -AtLogOn -User $currentUser
$trayLogonTrigger.Delay = 'PT20S'

$traySettings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Seconds 0)

Register-ScheduledTask `
    -TaskName 'ChefFlow-MissionControlTray' `
    -Action $trayAction `
    -Trigger $trayLogonTrigger `
    -Settings $traySettings `
    -Description 'Starts the Mission Control tray after login.' `
    -Force `
    -ErrorAction Stop | Out-Null

Write-Host 'Registered startup tasks:' -ForegroundColor Green
Write-Host "  ChefFlow-Watchdog           - $watchdogMode"
Write-Host '  ChefFlow-MissionControlTray - logon'
