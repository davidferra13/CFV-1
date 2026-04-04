# ChefFlow + OpenClaw Daily Sync Check
# Runs via Task Scheduler at 6:30 AM daily
# Launches Claude Code with the full environment verification prompt

$projectDir = "C:\Users\david\Documents\CFv1"
$logFile    = "$projectDir\logs\daily-sync-check.log"

# Ensure log directory exists
if (-not (Test-Path "$projectDir\logs")) {
    New-Item -ItemType Directory -Path "$projectDir\logs" -Force | Out-Null
}

# Rotate log if it exceeds 1 MB
if ((Test-Path $logFile) -and (Get-Item $logFile).Length -gt 1MB) {
    Remove-Item "$logFile.old" -ErrorAction SilentlyContinue
    Rename-Item  $logFile "$logFile.old" -ErrorAction SilentlyContinue
}

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Add-Content -Path $logFile -Value "[$timestamp] Starting daily sync check..."

$prompt = @"
Chef Flow + OpenClaw Integrations

Verify whether this entire project is fully up to date across all environments (local, development, staging, production). There could be work to done or nothing at all. It is always good to check on a daily schedule.

You must:

- Compare code, dependencies, environment variables, database schema, and migrations across all environments
- Confirm that deployed versions match the current source of truth
- Identify any mismatches, drift, or incomplete deployments
- Validate that all required services are running and connected correctly
- Validate if any others agents are current working that requires for the builder to wait

Output:

- A clear yes or no: is everything fully in sync across all environments?
- If no, list every discrepancy with exact details and where it exists

Do not assume. Only report what can be verified from actual state.
"@

try {
    Set-Location $projectDir
    $result = $prompt | claude --print --model haiku --max-budget-usd 2 --allowedTools "Bash(git:*)" --allowedTools "Bash(docker:*)" --allowedTools "Bash(npm:*)" --allowedTools "Bash(ssh:*)" --allowedTools "Bash(node:*)" --allowedTools "Bash(cat:*)" --allowedTools "Bash(ls:*)" --allowedTools "Bash(powershell:*)" --allowedTools "Read" --allowedTools "Glob" --allowedTools "Grep" 2>&1
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $logFile -Value "[$timestamp] Sync check completed."
    Add-Content -Path $logFile -Value $result
    Add-Content -Path $logFile -Value ""
    Add-Content -Path $logFile -Value "=========================================="
}
catch {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $logFile -Value "[$timestamp] ERROR: $($_.Exception.Message)"
}
