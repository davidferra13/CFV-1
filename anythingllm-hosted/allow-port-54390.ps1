$ruleName = "AnythingLLM Hosted 54390"

$existing = netsh advfirewall firewall show rule name="$ruleName" 2>$null
if ($LASTEXITCODE -eq 0 -and $existing -match [regex]::Escape($ruleName)) {
  Write-Host "Firewall rule already exists: $ruleName"
  exit 0
}

netsh advfirewall firewall add rule `
  name="$ruleName" `
  dir=in `
  action=allow `
  protocol=TCP `
  localport=54390 `
  profile=private,public

if ($LASTEXITCODE -ne 0) {
  Write-Error "Failed to add firewall rule. Run this script from an elevated PowerShell window."
  exit $LASTEXITCODE
}

Write-Host "Firewall rule added for TCP 54390."
