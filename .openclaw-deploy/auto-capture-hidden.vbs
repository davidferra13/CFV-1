' Silent launcher for OpenClaw Session Capture scheduled task
' Runs bash script with ZERO visible window - no flash, no popup
' Used by Task Scheduler instead of bash.exe directly to prevent window stealing focus

Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\Users\david\Documents\CFv1\.openclaw-deploy"
' 0 = hidden window, True = wait for completion
WshShell.Run """C:\Program Files\Git\bin\bash.exe"" -c ""cd /c/Users/david/Documents/CFv1/.openclaw-deploy; bash auto-capture-session.sh""", 0, True
Set WshShell = Nothing
