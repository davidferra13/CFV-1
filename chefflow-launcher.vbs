Set fso = CreateObject("Scripting.FileSystemObject")
Set objShell = CreateObject("WScript.Shell")
projectDir = fso.GetParentFolderName(WScript.ScriptFullName)
watchdogScript = fso.BuildPath(projectDir, "chefflow-watchdog.ps1")
command = "powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -NonInteractive -File " & Chr(34) & watchdogScript & Chr(34)
objShell.Run command, 0, False
