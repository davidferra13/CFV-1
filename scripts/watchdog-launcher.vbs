' ChefFlow Watchdog - Silent Launcher
' Resolves the repository root from this launcher's own location.
Set fso = CreateObject("Scripting.FileSystemObject")
Set objShell = CreateObject("WScript.Shell")
scriptsDir = fso.GetParentFolderName(WScript.ScriptFullName)
projectDir = fso.GetParentFolderName(scriptsDir)
watchdogScript = fso.BuildPath(projectDir, "chefflow-watchdog.ps1")
command = "powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -NonInteractive -File " & Chr(34) & watchdogScript & Chr(34) & " -NoTray"
objShell.Run command, 0, False
