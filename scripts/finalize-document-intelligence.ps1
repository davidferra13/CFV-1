$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

if (-not $env:SUPABASE_DB_PASSWORD) {
  Write-Error 'SUPABASE_DB_PASSWORD is not set. Export it, then rerun this script.'
}

Write-Host ''
Write-Host '== Document Intelligence Finalize =='
Write-Host '1. Backing up linked Supabase database'

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupPath = Join-Path $repoRoot "backups\backup-$timestamp.sql"

npx supabase db dump --linked | Out-File -FilePath $backupPath -Encoding utf8

if (-not (Test-Path $backupPath) -or ((Get-Item $backupPath).Length -lt 100)) {
  throw "Backup failed or produced an empty file: $backupPath"
}

Write-Host "   Backup saved to $backupPath"
Write-Host '2. Pushing migrations'

npx supabase db push --linked

Write-Host '3. Verifying import page still renders'

$authBody = @{
  email = 'agent@chefflow.test'
  password = 'AgentChefFlow!2026'
} | ConvertTo-Json

$authResponse = Invoke-WebRequest `
  -Uri 'http://localhost:3100/api/e2e/auth' `
  -Method POST `
  -ContentType 'application/json' `
  -Body $authBody `
  -SessionVariable authSession

if ($authResponse.StatusCode -ne 200) {
  throw "Auth smoke test failed with status $($authResponse.StatusCode)"
}

$importResponse = Invoke-WebRequest `
  -Uri 'http://localhost:3100/import' `
  -WebSession $authSession

$content = $importResponse.Content
if ($importResponse.StatusCode -ne 200) {
  throw "Import page smoke test failed with status $($importResponse.StatusCode)"
}
if ($content -notmatch 'Smart Import') {
  throw 'Import page smoke test failed: Smart Import text missing'
}

if ($content -match 'Archive Inbox is unavailable') {
  throw 'Archive Inbox is still unavailable after migration push'
}

Write-Host ''
Write-Host 'Document Intelligence finalize complete.'
