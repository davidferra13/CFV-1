' ChefFlow Mission Control Tray - Silent Launcher
' Launches the tray PowerShell script with no console window.
Set objShell = CreateObject("WScript.Shell")
objShell.Run "powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -NonInteractive -File ""C:\Users\david\Documents\CFv1\scripts\launcher\tray.ps1""", 0, False
