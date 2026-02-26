' ═══════════════════════════════════════════════════════════════════
'  ChefFlow Mission Control — Silent Launcher (no console window)
'  Double-click this to start the dashboard server + open the UI
' ═══════════════════════════════════════════════════════════════════

Set objShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Get the project root (two levels up from this script)
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
projectRoot = fso.GetParentFolderName(fso.GetParentFolderName(scriptDir))

' Start the server silently
objShell.Run "cmd /c cd /d """ & projectRoot & """ && node scripts/launcher/server.mjs", 0, False

' Wait for server to be ready
WScript.Sleep 2000

' Open in Chrome app mode (native feel) on monitor 3
objShell.Run "cmd /c start """" chrome --app=http://localhost:3200 --window-size=1100,750 --window-position=2560,100", 0, False
