# Quick audit: find recently-launched scheduled tasks
try {
    $events = Get-WinEvent -LogName 'Microsoft-Windows-TaskScheduler/Operational' -MaxEvents 60 -ErrorAction Stop
    $events | Where-Object { $_.Id -eq 200 -or $_.Id -eq 129 } | Select-Object -First 20 | ForEach-Object {
        [PSCustomObject]@{
            Time = $_.TimeCreated
            EventId = $_.Id
            Message = ($_.Message -split "`r?`n")[0]
        }
    } | Format-Table -AutoSize -Wrap
} catch {
    Write-Output "Event log unavailable: $_"
}
