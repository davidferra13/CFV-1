# ChefFlow Host Config Backup (FREE - no AI, no API cost)
# Creates an encrypted recovery bundle for secrets and host configuration.
# This is read-only: it copies files, exports task XML, zips the bundle, encrypts it, and removes plaintext temp files.

$projectDir = "C:\Users\david\Documents\CFv1"
$backupDir = "$projectDir\backups\host-config"
$logFile = "$projectDir\logs\host-config-backup.log"
$timestamp = Get-Date -Format "yyyy-MM-dd-HHmmss"
$workDir = Join-Path $env:TEMP "chefflow-host-config-$timestamp"
$zipPath = "$backupDir\chefflow-host-config-$timestamp.zip"
$encryptedPath = "$zipPath.gpg"

function Write-Log {
    param([string]$Message)
    $now = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $logFile -Value "[$now] $Message"
}

function Get-EnvFileValue {
    param([string]$Name)

    $envValue = [Environment]::GetEnvironmentVariable($Name)
    if ($envValue) {
        return $envValue
    }

    $envFile = Join-Path $projectDir ".env.local"
    if (-not (Test-Path $envFile)) {
        return $null
    }

    $line = Get-Content $envFile | Where-Object { $_ -match "^$Name=" } | Select-Object -First 1
    if (-not $line) {
        return $null
    }

    return ($line -replace "^$Name=", "").Trim().Trim('"').Trim("'")
}

function Copy-IfExists {
    param(
        [string]$Source,
        [string]$Destination
    )

    if (Test-Path $Source) {
        $destDir = Split-Path -Parent $Destination
        if (-not (Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }
        Copy-Item -LiteralPath $Source -Destination $Destination -Force
        Write-Log "Captured: $Source"
    }
}

New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
New-Item -ItemType Directory -Path "$projectDir\logs" -Force | Out-Null

if ((Test-Path $logFile) -and (Get-Item $logFile).Length -gt 1MB) {
    Remove-Item "$logFile.old" -ErrorAction SilentlyContinue
    Rename-Item $logFile "$logFile.old" -ErrorAction SilentlyContinue
}

$passphrase = Get-EnvFileValue -Name "BACKUP_PASSPHRASE"
if (-not $passphrase) {
    Write-Log "FAIL: BACKUP_PASSPHRASE is required for host config backups"
    exit 1
}

try {
    Write-Log "Starting host config backup"
    New-Item -ItemType Directory -Path $workDir -Force | Out-Null

    Copy-IfExists "$projectDir\.env.local" "$workDir\secrets\.env.local"
    Copy-IfExists "$projectDir\.auth\agent.json" "$workDir\secrets\.auth\agent.json"
    Copy-IfExists "$projectDir\.auth\developer.json" "$workDir\secrets\.auth\developer.json"
    Copy-IfExists "$projectDir\docker-compose.yml" "$workDir\config\docker-compose.yml"
    Copy-IfExists "$projectDir\chefflow-watchdog.ps1" "$workDir\config\chefflow-watchdog.ps1"
    Copy-IfExists "$env:APPDATA\rclone\rclone.conf" "$workDir\config\rclone\rclone.conf"
    Copy-IfExists "$env:USERPROFILE\.cloudflared\config.yml" "$workDir\config\cloudflared\config.yml"
    Copy-IfExists "$env:USERPROFILE\.cloudflared\cert.pem" "$workDir\config\cloudflared\cert.pem"

    $taskDir = "$workDir\tasks"
    New-Item -ItemType Directory -Path $taskDir -Force | Out-Null
    Get-ScheduledTask |
        Where-Object { $_.TaskName -like "ChefFlow-*" -or $_.TaskName -like "OpenClaw*" } |
        ForEach-Object {
            $safeName = ($_.TaskName -replace '[^\w.-]', '_')
            try {
                Export-ScheduledTask -TaskName $_.TaskName -TaskPath $_.TaskPath |
                    Out-File -FilePath "$taskDir\$safeName.xml" -Encoding utf8
                Write-Log "Exported scheduled task: $($_.TaskName)"
            } catch {
                Write-Log "WARN: Failed to export scheduled task $($_.TaskName): $($_.Exception.Message)"
            }
        }

    $gitManifest = @{
        generatedAt = (Get-Date).ToString("o")
        branch = (git -C $projectDir branch --show-current 2>$null)
        commit = (git -C $projectDir rev-parse HEAD 2>$null)
        remotes = (git -C $projectDir remote -v 2>$null)
    }
    $gitManifest | ConvertTo-Json -Depth 4 | Out-File "$workDir\git-manifest.json" -Encoding utf8

    Compress-Archive -Path "$workDir\*" -DestinationPath $zipPath -Force

    $passphrase | & gpg --batch --yes --passphrase-fd 0 --symmetric --cipher-algo AES256 -o $encryptedPath $zipPath 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path $encryptedPath)) {
        Write-Log "FAIL: gpg encryption failed"
        exit 1
    }

    Remove-Item -LiteralPath $zipPath -Force -ErrorAction SilentlyContinue

    $hash = (Get-FileHash -Algorithm SHA256 -Path $encryptedPath).Hash.ToLowerInvariant()
    $manifest = @{
        version = 1
        createdAt = (Get-Date).ToString("o")
        fileName = Split-Path -Leaf $encryptedPath
        sizeBytes = (Get-Item $encryptedPath).Length
        sha256 = $hash
        encrypted = $true
        format = "host-config-zip"
    }
    $manifest | ConvertTo-Json -Depth 4 | Out-File "$encryptedPath.manifest.json" -Encoding utf8

    Get-ChildItem "$backupDir\chefflow-host-config-*.zip.gpg" -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -Skip 12 |
        ForEach-Object {
            Remove-Item -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue
            Remove-Item -LiteralPath "$($_.FullName).manifest.json" -Force -ErrorAction SilentlyContinue
            Write-Log "Pruned old host config backup: $($_.Name)"
        }

    Write-Log "Host config backup complete: $(Split-Path -Leaf $encryptedPath)"
} catch {
    Write-Log "FAIL: $($_.Exception.Message)"
    exit 1
} finally {
    if (Test-Path $workDir) {
        Remove-Item -LiteralPath $workDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}
