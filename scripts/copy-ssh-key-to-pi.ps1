# Copy SSH public key to Raspberry Pi for passwordless auth
# Reads credentials from .auth/pi.json
# Run once, then delete this script

$creds = Get-Content "$PSScriptRoot\..\.auth\pi.json" | ConvertFrom-Json
$pubKey = Get-Content "$env:USERPROFILE\.ssh\id_ed25519.pub"
$host_ip = $creds.host
$user = $creds.username
$pass = $creds.password

Write-Host "Copying SSH key to $user@$host_ip ..."

# Use plink if available, otherwise fall back to ssh with stdin password
$cmd = "mkdir -p ~/.ssh && echo '$pubKey' >> ~/.ssh/authorized_keys && chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys && echo 'KEY_COPIED_OK'"

# Write an expect-like script using PowerShell
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "ssh"
$psi.Arguments = "-o StrictHostKeyChecking=no $user@$host_ip `"$cmd`""
$psi.RedirectStandardInput = $true
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.UseShellExecute = $false

$proc = [System.Diagnostics.Process]::Start($psi)

# Wait for password prompt then send password
Start-Sleep -Seconds 2
$proc.StandardInput.WriteLine($pass)
$proc.StandardInput.Close()

$output = $proc.StandardOutput.ReadToEnd()
$errors = $proc.StandardError.ReadToEnd()
$proc.WaitForExit(30000)

if ($output -match "KEY_COPIED_OK") {
    Write-Host "SUCCESS: SSH key copied. Passwordless auth is now active." -ForegroundColor Green
} else {
    Write-Host "Output: $output" -ForegroundColor Yellow
    Write-Host "Errors: $errors" -ForegroundColor Red
    Write-Host "Exit code: $($proc.ExitCode)"
}
