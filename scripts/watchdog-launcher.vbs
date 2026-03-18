' ChefFlow Watchdog - Silent Launcher
' Launches the watchdog PowerShell script with zero visible windows.
' Used by Task Scheduler to prevent the console flash on logon.
'
' To show the watchdog window for debugging, change the "0" below to "1".
Set objShell = CreateObject("WScript.Shell")
objShell.Run "powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -NonInteractive -File ""C:\Users\david\Documents\CFv1\chefflow-watchdog.ps1""", 0, False
