Set objShell = CreateObject("WScript.Shell")
objShell.Run "powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -NonInteractive -File ""C:\Users\david\Documents\CFv1\chefflow-watchdog.ps1""", 0, False
