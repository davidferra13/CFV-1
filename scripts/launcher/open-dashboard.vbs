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
objShell.Run "cmd /c cd /d """ & projectRoot & """ && node --watch scripts/launcher/server.mjs", 0, False

' Wait for server to be ready
WScript.Sleep 2000

' Get secondary monitor position from PowerShell helper
Dim monX, monY
monX = 2560 : monY = 100  ' fallback defaults
On Error Resume Next
Dim psCmd
psCmd = "powershell -NoProfile -ExecutionPolicy Bypass -Command ""Add-Type -AssemblyName System.Windows.Forms; $s = [System.Windows.Forms.Screen]::AllScreens | Where-Object { -not $_.Primary } | Sort-Object { $_.Bounds.X } | Select-Object -First 1; if ($s) { Write-Output ('' + ($s.WorkingArea.X + 100) + ',' + ($s.WorkingArea.Y + 50)) } else { Write-Output '2560,100' }"""
Dim exec
Set exec = objShell.Exec(psCmd)
If Not exec Is Nothing Then
    Dim posResult
    posResult = Trim(exec.StdOut.ReadLine())
    If posResult <> "" Then
        Dim parts
        parts = Split(posResult, ",")
        If UBound(parts) = 1 Then
            monX = CInt(parts(0))
            monY = CInt(parts(1))
        End If
    End If
End If
On Error GoTo 0

' Open in Chrome app mode (native feel) on secondary monitor
objShell.Run "cmd /c start """" chrome --app=http://localhost:41937 --window-size=1100,750 --window-position=" & monX & "," & monY, 0, False
