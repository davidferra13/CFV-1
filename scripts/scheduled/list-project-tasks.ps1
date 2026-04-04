Get-ScheduledTask | Where-Object {
    $_.TaskName -like 'ChefFlow-*' -or $_.TaskName -like 'OpenClaw*' -or $_.TaskName -eq 'PiTether'
} | ForEach-Object {
    $info = Get-ScheduledTaskInfo $_.TaskName -ErrorAction SilentlyContinue
    Write-Output "$($_.TaskName.PadRight(35)) $($_.State.ToString().PadRight(10)) Next: $($info.NextRunTime)"
} | Sort-Object
