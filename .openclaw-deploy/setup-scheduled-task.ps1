$action = New-ScheduledTaskAction -Execute "C:\Program Files\Git\bin\bash.exe" -Argument "-c 'cd /c/Users/david/Documents/CFv1/.openclaw-deploy; bash auto-capture-session.sh'"
$trigger = New-ScheduledTaskTrigger -Daily -At 6am
Register-ScheduledTask -TaskName "OpenClaw Session Capture" -Action $action -Trigger $trigger -Description "Capture Instacart session cookies and deploy to Pi" -Force
