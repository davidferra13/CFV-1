$WshShell = New-Object -ComObject WScript.Shell
$Desktop = [Environment]::GetFolderPath('Desktop')
$Shortcut = $WshShell.CreateShortcut("$Desktop\Ping Pi Ollama.lnk")
$Shortcut.TargetPath = "C:\Users\david\Documents\CFv1\scripts\ping-pi-ollama.bat"
$Shortcut.WorkingDirectory = "C:\Users\david\Documents\CFv1"
$Shortcut.Description = "Trigger Ollama on Raspberry Pi"
$Shortcut.Save()
Write-Host "Desktop shortcut created: $Desktop\Ping Pi Ollama.lnk"
