' =================================================================
'  ChefFlow Mission Control — Desktop Shortcut Launcher
'  Double-click to start the server (if needed) + open the UI
' =================================================================

Set objShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Get the project root (two levels up from scripts/launcher/)
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
projectRoot = fso.GetParentFolderName(fso.GetParentFolderName(scriptDir))

' Check if Mission Control server is already running on port 41937
serverRunning = False
On Error Resume Next
Set xmlHttp = CreateObject("MSXML2.ServerXMLHTTP.6.0")
xmlHttp.setTimeouts 2000, 2000, 2000, 2000
xmlHttp.Open "GET", "http://localhost:41937/api/status", False
xmlHttp.Send
If xmlHttp.Status = 200 Then
    serverRunning = True
End If
Set xmlHttp = Nothing
On Error GoTo 0

' Start the server if it's not running
If Not serverRunning Then
    objShell.Run "cmd /c cd /d """ & projectRoot & """ && node --watch scripts/launcher/server.mjs", 0, False
    ' Wait for server to come up
    WScript.Sleep 2500
End If

' Open in Chrome app mode (native feel)
' Try Chrome first
chromePath = ""
On Error Resume Next
chromePath = objShell.RegRead("HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe\")
On Error GoTo 0

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

Dim posFlag
posFlag = "--window-position=" & monX & "," & monY

If chromePath <> "" Then
    objShell.Run """" & chromePath & """ --app=http://localhost:41937 --window-size=1100,750 " & posFlag, 0, False
Else
    ' Try finding chrome on PATH
    exitCode = objShell.Run("cmd /c where chrome >nul 2>&1", 0, True)
    If exitCode = 0 Then
        objShell.Run "cmd /c start """" chrome --app=http://localhost:41937 --window-size=1100,750 " & posFlag, 0, False
    Else
        ' Try Edge as fallback
        exitCode = objShell.Run("cmd /c where msedge >nul 2>&1", 0, True)
        If exitCode = 0 Then
            objShell.Run "cmd /c start """" msedge --app=http://localhost:41937 --window-size=1100,750 " & posFlag, 0, False
        Else
            ' Final fallback: default browser
            objShell.Run "http://localhost:41937", 1, False
        End If
    End If
End If
