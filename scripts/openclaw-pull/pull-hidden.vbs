' Silent launcher for OpenClaw-Pull scheduled task
' Runs the Node script with ZERO visible window - no flash, no popup
' Used by Task Scheduler instead of cmd.exe /c to prevent window stealing focus

Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\Users\david\Documents\CFv1"
' 0 = hidden window, True = wait for completion
WshShell.Run "cmd.exe /c node scripts\openclaw-pull\pull.mjs >> .openclaw-deploy\logs\pull.log 2>&1", 0, True
Set WshShell = Nothing
