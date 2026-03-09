# Register Task Scheduler task for ChefFlow Beta Server
# Run this once with admin privileges: Right-click > Run as Administrator

$action = New-ScheduledTaskAction -Execute 'pwsh.exe' -Argument '-WindowStyle Hidden -File C:\Users\david\Documents\CFv1\scripts\start-beta.ps1'
$trigger = New-ScheduledTaskTrigger -AtLogOn -User 'david'
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
Register-ScheduledTask -TaskName 'ChefFlow Beta Server' -Action $action -Trigger $trigger -Settings $settings -Description 'Starts ChefFlow beta server on port 3200' -Force
Write-Host "Task 'ChefFlow Beta Server' registered successfully" -ForegroundColor Green
