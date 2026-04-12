# ChefFlow Platform Observability Digest
# Sends the daily developer observability digest email directly from the local codebase.

$projectDir = "C:\Users\david\Documents\CFv1"
$logFile = "$projectDir\logs\platform-observability-digest.log"

if (-not (Test-Path "$projectDir\logs")) {
    New-Item -ItemType Directory -Path "$projectDir\logs" -Force | Out-Null
}

if ((Test-Path $logFile) -and (Get-Item $logFile).Length -gt 1MB) {
    Remove-Item "$logFile.old" -ErrorAction SilentlyContinue
    Rename-Item $logFile "$logFile.old" -ErrorAction SilentlyContinue
}

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $logFile -Value "[$timestamp] $Message"
}

try {
    Set-Location $projectDir
    $output = node --import tsx scripts/send-platform-observability-digest.ts 2>&1

    if ($LASTEXITCODE -ne 0) {
        $message = ($output | Out-String).Trim()
        if ([string]::IsNullOrWhiteSpace($message)) {
            $message = "node digest sender exited with code $LASTEXITCODE"
        }
        Write-Log "ERROR: $message"
        exit $LASTEXITCODE
    }

    $message = ($output | Out-String).Trim()
    Write-Log "SUCCESS: $message"
} catch {
    Write-Log "ERROR: $($_.Exception.Message)"
    exit 1
}
