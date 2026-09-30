param(
    [switch]$NoTray,
    [switch]$SinglePass
)

# Resolve from this script's own checkout so the launcher, task, and watchdog
# always serve the same tree (production runs from a clean main checkout).
$projectDir = $PSScriptRoot
$logFile = "$projectDir\chefflow-watchdog.log"

function Resolve-ExecutablePath {
    param(
        [string]$PreferredPath,
        [string]$CommandName
    )

    if ($PreferredPath -and (Test-Path $PreferredPath)) {
        return $PreferredPath
    }

    if ($CommandName) {
        $command = Get-Command $CommandName -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($command -and $command.Source) {
            return $command.Source
        }
    }

    return $PreferredPath
}

$nodeExe = Resolve-ExecutablePath -PreferredPath 'C:\nvm4w\nodejs\node.exe' -CommandName 'node'
$gitExe = Resolve-ExecutablePath -PreferredPath 'C:\Program Files\Git\cmd\git.exe' -CommandName 'git'
$dockerExe = Resolve-ExecutablePath -PreferredPath 'C:\Program Files\Docker\Docker\resources\bin\docker.exe' -CommandName 'docker'
$dockerDesktopExe = Resolve-ExecutablePath -PreferredPath 'C:\Program Files\Docker\Docker\Docker Desktop.exe' -CommandName ''
$ollamaExe = Resolve-ExecutablePath -PreferredPath 'C:\Users\david\AppData\Local\Programs\Ollama\ollama.exe' -CommandName 'ollama'
$stableCloudflared = Join-Path $env:USERPROFILE 'Tools\cloudflared\cloudflared.exe'
$legacyCloudflared = Join-Path $env:APPDATA 'npm\node_modules\cloudflared\bin\cloudflared.exe'
$preferredCloudflared = if (Test-Path $stableCloudflared) { $stableCloudflared } else { $legacyCloudflared }
$cloudflaredExe = Resolve-ExecutablePath -PreferredPath $preferredCloudflared -CommandName 'cloudflared'
$powershellExe = Resolve-ExecutablePath -PreferredPath "$env:WINDIR\System32\WindowsPowerShell\v1.0\powershell.exe" -CommandName 'powershell'

# ============================================
# Mutex -- prevent duplicate watchdog instances
# ============================================
$mutexName = "Global\ChefFlowWatchdog"
$createdNew = $false
$script:watchdogMutex = New-Object System.Threading.Mutex($true, $mutexName, [ref]$createdNew)
if (-not $createdNew) {
    exit 0
}

Register-EngineEvent PowerShell.Exiting -Action {
    try {
        $script:watchdogMutex.ReleaseMutex()
    } catch {
        # Best effort release on shutdown.
    }
} | Out-Null

function Write-Log {
    param([string]$Message)

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $logFile -Value "[$timestamp] $Message"
}

if ((Test-Path $logFile) -and (Get-Item $logFile).Length -gt 1MB) {
    Remove-Item "$logFile.old" -ErrorAction SilentlyContinue
    Rename-Item $logFile "$logFile.old" -ErrorAction SilentlyContinue
}

$script:managedProcesses = @{}
$script:lastBuildDriftSignature = $null
$script:dockerLaunchAttempted = $false

$dashboardPort = 41937
$devPort = 3100
$betaPort = 3200
$prodPort = 3100
$dbPort = 54322
$prodBuildMarker = "$projectDir\.next\BUILD_ID"
$trayScript = "$projectDir\scripts\launcher\tray.ps1"
$prodTunnelId = '9dab6929-68e3-4775-9b8e-17482f714e83'
$prodTunnelConfig = "$env:USERPROFILE\.cloudflared\chefflow-prod.yml"
$prodTunnelCredential = "$env:USERPROFILE\.cloudflared\$prodTunnelId.json"
$prodTunnelBootstrap = "$projectDir\scripts\ensure-production-tunnel.ps1"
$publicAppHealthUrl = 'https://app.cheflowhq.com/api/health/ping'
$publicRootUrl = 'https://cheflowhq.com/'
$script:publicEdgeFailureCount = 0
$script:publicEdgeCooldownUntil = [datetime]::MinValue
$prodEnvironment = @{
    PORT = [string]$prodPort
    HOST = '127.0.0.1'
    NODE_ENV = 'production'
    NEXT_PUBLIC_SITE_URL = 'https://app.cheflowhq.com'
    NEXT_PUBLIC_APP_URL = 'https://app.cheflowhq.com'
    NEXTAUTH_URL = 'https://app.cheflowhq.com'
    AUTH_URL = 'https://app.cheflowhq.com'
}
$betaTunnelId = '03fc407c-cfe6-4758-a239-299cfa615fcc'
$betaTunnelConfig = "$projectDir\.cloudflared\config.yml"

function Test-PortInUse {
    param([int]$Port)

    $listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    return ($null -ne $listener)
}

function Test-HttpHealthy {
    param([string]$Url)

    try {
        $response = Invoke-WebRequest -Uri $Url -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
        return ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400)
    } catch {
        return $false
    }
}

function Get-PortOwners {
    param([int]$Port)

    $pids = @(
        Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
            Select-Object -ExpandProperty OwningProcess -Unique
    )

    if ($pids.Count -eq 0) {
        return @()
    }

    return @(
        Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
            Where-Object { $pids -contains $_.ProcessId } |
            Select-Object ProcessId, Name, CommandLine
    )
}

function Test-PortOwnedByProject {
    param([int]$Port)

    $owners = Get-PortOwners $Port
    if ($owners.Count -eq 0) {
        return $false
    }

    $projectMarker = $projectDir.ToLower()

    foreach ($owner in $owners) {
        $commandLine = [string]$owner.CommandLine
        if ([string]::IsNullOrWhiteSpace($commandLine) -or -not $commandLine.ToLower().Contains($projectMarker)) {
            return $false
        }
    }

    return $true
}

function Stop-NonProjectPortOwners {
    param([int]$Port)

    $projectMarker = $projectDir.ToLower()
    foreach ($owner in Get-PortOwners $Port) {
        $commandLine = [string]$owner.CommandLine
        $displayCommand = if ([string]::IsNullOrWhiteSpace($commandLine)) { '<unknown>' } else { $commandLine }

        if ([string]::IsNullOrWhiteSpace($commandLine) -or -not $commandLine.ToLower().Contains($projectMarker)) {
            Write-Log "Port $Port occupied by foreign process PID $($owner.ProcessId) [$($owner.Name)] $displayCommand -- leaving it untouched."
        }
    }
}

function Test-ProcessCommandRunning {
    param([string[]]$Patterns)

    $normalizedPatterns = @(
        $Patterns |
            Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
            ForEach-Object { $_.ToLower() }
    )

    if ($normalizedPatterns.Count -eq 0) {
        return $false
    }

    foreach ($processInfo in Get-CimInstance Win32_Process -ErrorAction SilentlyContinue) {
        $commandLine = [string]$processInfo.CommandLine
        if ([string]::IsNullOrWhiteSpace($commandLine)) {
            continue
        }

        $commandLower = $commandLine.ToLower()
        $matchesAll = $true
        foreach ($pattern in $normalizedPatterns) {
            if (-not $commandLower.Contains($pattern)) {
                $matchesAll = $false
                break
            }
        }

        if ($matchesAll) {
            return $true
        }
    }

    return $false
}

function Clear-ExitedManagedProcess {
    param([string]$Key)

    if (-not $script:managedProcesses.ContainsKey($Key)) {
        return
    }

    $managed = $script:managedProcesses[$Key]
    $process = $managed.Process

    try {
        if (-not $process.HasExited) {
            return
        }

        Write-Log "$($managed.Label) stopped (exit $($process.ExitCode))."
    } catch {
        Write-Log "$($managed.Label) stopped."
    }

    $script:managedProcesses.Remove($Key)
}

function Test-ManagedProcessRunning {
    param([string]$Key)

    Clear-ExitedManagedProcess $Key
    return $script:managedProcesses.ContainsKey($Key)
}

function Start-ManagedProcess {
    param(
        [string]$Key,
        [string]$Label,
        [string]$FileName,
        [string]$Arguments,
        [string]$WorkingDirectory = $projectDir,
        [hashtable]$EnvironmentVariables = @{}
    )

    if (Test-ManagedProcessRunning $Key) {
        return
    }

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $FileName
    $psi.Arguments = $Arguments
    $psi.WorkingDirectory = $WorkingDirectory
    $psi.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden
    $psi.CreateNoWindow = $true
    $psi.UseShellExecute = $false

    foreach ($entry in $EnvironmentVariables.GetEnumerator()) {
        $psi.EnvironmentVariables[$entry.Key] = [string]$entry.Value
    }

    try {
        $process = [System.Diagnostics.Process]::Start($psi)
        $script:managedProcesses[$Key] = @{
            Label = $Label
            Process = $process
        }
        Write-Log "$Label started (PID $($process.Id))."
    } catch {
        Write-Log "Failed to start ${Label}: $($_.Exception.Message)"
    }
}

function Get-GitHeadShort {
    if (-not $gitExe -or -not (Test-Path $gitExe)) {
        return $null
    }

    try {
        $head = & $gitExe -C $projectDir rev-parse --short HEAD 2>$null
        if ($LASTEXITCODE -eq 0) {
            return ([string]$head).Trim()
        }
    } catch {
        # Fall through to null when git is unavailable.
    }

    return $null
}

function Get-ReleaseBuildId {
    if (-not (Test-Path $prodBuildMarker)) {
        return $null
    }

    try {
        return (Get-Content $prodBuildMarker -TotalCount 1).Trim()
    } catch {
        return $null
    }
}

function Test-ReleaseBuildCurrent {
    $buildId = Get-ReleaseBuildId
    $gitHead = Get-GitHeadShort
    return (
        -not [string]::IsNullOrWhiteSpace($buildId) -and
        -not [string]::IsNullOrWhiteSpace($gitHead) -and
        $buildId -eq $gitHead
    )
}

function Ensure-ReleaseBuildReady {
    Clear-ExitedManagedProcess 'releaseBuild'

    if (Test-ReleaseBuildCurrent) {
        $script:lastBuildDriftSignature = $null
        return $true
    }

    if (Test-ManagedProcessRunning 'releaseBuild') {
        return $false
    }

    $buildId = Get-ReleaseBuildId
    $gitHead = Get-GitHeadShort
    $driftSignature = "build=$buildId|head=$gitHead"
    $releasePortBusy = (Test-PortInUse $prodPort) -or (Test-PortInUse $betaPort)

    if ($releasePortBusy) {
        if ($script:lastBuildDriftSignature -ne $driftSignature) {
            Write-Log "[build] BUILD_ID drift detected ($driftSignature), but a release server is already online. Skipping hot rebuild."
            $script:lastBuildDriftSignature = $driftSignature
        }
        return $true
    }

    $script:lastBuildDriftSignature = $null
    Write-Log "[build] Release artifact missing or stale ($driftSignature). Building before prod/beta start."
    Start-ManagedProcess `
        -Key 'releaseBuild' `
        -Label '[build] Release build' `
        -FileName $nodeExe `
        -Arguments 'scripts/run-next-build.mjs' `
        -EnvironmentVariables $prodEnvironment

    return $false
}

function Test-DockerReady {
    if (-not $dockerExe -or -not (Test-Path $dockerExe)) {
        return $false
    }

    try {
        $null = & $dockerExe version --format '{{.Server.Version}}' 2>$null
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

function Ensure-DockerReady {
    if (Test-DockerReady) {
        return $true
    }

    $dockerDesktopRunning = Get-Process 'Docker Desktop', 'com.docker.backend' -ErrorAction SilentlyContinue
    if (-not $dockerDesktopRunning -and -not $script:dockerLaunchAttempted) {
        $script:dockerLaunchAttempted = $true

        $dockerService = Get-Service -Name 'com.docker.service' -ErrorAction SilentlyContinue
        if ($dockerService -and $dockerService.Status -ne 'Running') {
            try {
                Start-Service -Name 'com.docker.service' -ErrorAction Stop
                Write-Log '[docker] Started com.docker.service.'
            } catch {
                Write-Log "[docker] Failed to start com.docker.service: $($_.Exception.Message)"
            }
        }

        if ($dockerDesktopExe -and (Test-Path $dockerDesktopExe)) {
            try {
                Start-Process -FilePath $dockerDesktopExe -WindowStyle Hidden
                Write-Log '[docker] Launching Docker Desktop.'
            } catch {
                Write-Log "[docker] Failed to launch Docker Desktop: $($_.Exception.Message)"
            }
        } else {
            Write-Log '[docker] Docker Desktop binary not found.'
        }
    }

    for ($attempt = 0; $attempt -lt 20; $attempt++) {
        Start-Sleep -Seconds 3
        if (Test-DockerReady) {
            Write-Log '[docker] Docker engine is online.'
            return $true
        }
    }

    return (Test-DockerReady)
}

function Get-PostgresContainerState {
    if (-not (Test-DockerReady)) {
        return @{
            Exists = $false
            Running = $false
            Health = $null
        }
    }

    try {
        $output = & $dockerExe inspect --format '{{.State.Running}}|{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' chefflow_postgres 2>$null
        if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($output)) {
            return @{
                Exists = $false
                Running = $false
                Health = $null
            }
        }

        $parts = ([string]$output).Trim().Split('|', 2)
        return @{
            Exists = $true
            Running = ($parts[0] -eq 'true')
            Health = if ($parts.Count -gt 1) { $parts[1] } else { $null }
        }
    } catch {
        return @{
            Exists = $false
            Running = $false
            Health = $null
        }
    }
}

function Ensure-PostgresRunning {
    # The database the app uses is whatever answers on $dbPort. After the
    # 2026-09-17 rebuild that container is named differently from the compose
    # file, so a listening port counts as ready; compose startup is only the
    # fallback when nothing is listening at all.
    if (Test-PortInUse $dbPort) {
        return $true
    }

    $state = Get-PostgresContainerState
    if ($state.Running -and ($state.Health -eq 'healthy')) {
        return $true
    }

    if (-not (Ensure-DockerReady)) {
        Write-Log '[db] Docker is not ready; postponing PostgreSQL startup.'
        return $false
    }

    Write-Log '[db] Starting chefflow_postgres via docker compose.'
    try {
        $startProcess = Start-Process `
            -FilePath $dockerExe `
            -ArgumentList @('compose', 'up', '-d', 'postgres') `
            -WorkingDirectory $projectDir `
            -WindowStyle Hidden `
            -Wait `
            -PassThru

        if ($startProcess.ExitCode -ne 0) {
            Write-Log "[db] docker compose up exited with code $($startProcess.ExitCode)."
            return $false
        }
    } catch {
        Write-Log "[db] Failed to launch docker compose: $($_.Exception.Message)"
        return $false
    }

    for ($attempt = 0; $attempt -lt 15; $attempt++) {
        Start-Sleep -Seconds 2
        $state = Get-PostgresContainerState
        if ($state.Running -and (($state.Health -eq 'healthy') -or (Test-PortInUse $dbPort))) {
            Write-Log '[db] chefflow_postgres is online.'
            return $true
        }
    }

    Write-Log '[db] chefflow_postgres did not become healthy in time.'
    return $false
}

function Get-OllamaBaseUrl {
    $envFile = "$projectDir\.env.local"
    if (Test-Path $envFile) {
        $line = Get-Content $envFile | Where-Object { $_ -match '^OLLAMA_BASE_URL=' }
        if ($line) {
            return ($line -split '=', 2)[1].Trim()
        }
    }

    return 'http://localhost:11434'
}

function Test-OllamaHealth {
    $baseUrl = Get-OllamaBaseUrl
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl/api/tags" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

function Ensure-OllamaRunning {
    if (Test-OllamaHealth) {
        return
    }

    Write-Log '[ollama] Ollama not responding - attempting startup.'
    $ollamaService = Get-Service -Name 'Ollama' -ErrorAction SilentlyContinue
    if ($ollamaService) {
        try {
            if ($ollamaService.Status -ne 'Running') {
                Start-Service -Name 'Ollama' -ErrorAction Stop
            }
            Start-Sleep -Seconds 8
            if (Test-OllamaHealth) {
                Write-Log '[ollama] Ollama service is online.'
                return
            }
        } catch {
            Write-Log "[ollama] Failed to start Ollama service: $($_.Exception.Message)"
        }
    }

    if (-not $ollamaExe -or -not (Test-Path $ollamaExe)) {
        Write-Log '[ollama] Ollama executable not found.'
        return
    }

    if (-not (Test-ProcessCommandRunning @('ollama.exe', 'serve'))) {
        Start-ManagedProcess `
            -Key 'ollama' `
            -Label '[ollama] ollama serve' `
            -FileName $ollamaExe `
            -Arguments 'serve'
        Start-Sleep -Seconds 8
    }

    if (Test-OllamaHealth) {
        Write-Log '[ollama] Ollama is online.'
    } else {
        Write-Log '[ollama] Ollama launch attempted but health probe still fails.'
    }
}

function Test-LocalDashboardPort {
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $tcp.Connect('127.0.0.1', $dashboardPort)
        $tcp.Close()
        return $true
    } catch {
        return $false
    }
}

function Ensure-MissionControlRunning {
    if (Test-LocalDashboardPort) {
        return
    }

    if (Test-ManagedProcessRunning 'dashboard') {
        return
    }

    Write-Log "[dashboard] Starting Mission Control on port $dashboardPort."
    Start-ManagedProcess `
        -Key 'dashboard' `
        -Label '[dashboard] Mission Control server' `
        -FileName $nodeExe `
        -Arguments 'scripts/launcher/server.mjs'
}

function Ensure-MissionControlTrayRunning {
    if ($NoTray -or -not [Environment]::UserInteractive) {
        return
    }

    $trayRunning = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
        Where-Object {
            $commandLine = [string]$_.CommandLine
            -not [string]::IsNullOrWhiteSpace($commandLine) -and
            $commandLine.ToLower().Contains('scripts\launcher\tray.ps1')
        }

    if ($trayRunning) {
        return
    }

    if (-not (Test-Path $trayScript)) {
        Write-Log '[dashboard] Tray script is missing.'
        return
    }

    try {
        Start-Process `
            -FilePath $powershellExe `
            -ArgumentList "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$trayScript`"" `
            -WindowStyle Hidden
        Write-Log '[dashboard] Mission Control tray started.'
    } catch {
        Write-Log "[dashboard] Failed to start tray: $($_.Exception.Message)"
    }
}

function Ensure-DevServerRunning {
    if (-not (Ensure-PostgresRunning)) {
        return
    }

    try {
        $output = & $nodeExe "$projectDir\scripts\dev-runtime.mjs" start 2>&1
        if ($LASTEXITCODE -eq 0) {
            if ($output) {
                Write-Log "[dev] Runtime controller: $output"
            }
        } else {
            Write-Log "[dev] Runtime controller failed: $output"
        }
    } catch {
        Write-Log "[dev] Runtime controller exception: $($_.Exception.Message)"
    }
}

function Ensure-BetaServerRunning {
    Clear-ExitedManagedProcess 'beta'

    if (Test-PortInUse $betaPort) {
        if (Test-PortOwnedByProject $betaPort) {
            return
        }

        Write-Log "Port $betaPort occupied by non-ChefFlow process. Reclaiming before beta launch."
        Stop-NonProjectPortOwners $betaPort
        return
    }

    if (Test-ManagedProcessRunning 'beta') {
        return
    }

    if (-not (Ensure-PostgresRunning)) {
        return
    }

    if (-not (Ensure-ReleaseBuildReady)) {
        return
    }

    Write-Log "[beta] Launching beta server on port $betaPort."
    Start-ManagedProcess `
        -Key 'beta' `
        -Label '[beta] Beta server' `
        -FileName $powershellExe `
        -Arguments "-NoProfile -ExecutionPolicy Bypass -File `"$projectDir\scripts\start-beta.ps1`""
}

function Ensure-ProdServerRunning {
    Clear-ExitedManagedProcess 'prod'

    if (Test-PortInUse $prodPort) {
        if (Test-PortOwnedByProject $prodPort) {
            return
        }

        Write-Log "Port $prodPort occupied by non-ChefFlow process. Leaving it untouched; prod launch deferred."
        Stop-NonProjectPortOwners $prodPort
        return
    }

    if (Test-ManagedProcessRunning 'prod') {
        return
    }

    if (-not (Ensure-PostgresRunning)) {
        return
    }

    if (-not (Ensure-ReleaseBuildReady)) {
        return
    }

    Write-Log "[prod] Launching production server on port $prodPort."
    Start-ManagedProcess `
        -Key 'prod' `
        -Label '[prod] Production server' `
        -FileName $nodeExe `
        -Arguments 'scripts/run-next-prod.mjs' `
        -EnvironmentVariables $prodEnvironment
}

function Ensure-CloudflaredTunnelRunning {
    param(
        [string]$Key,
        [string]$Label,
        [string]$TunnelId,
        [string]$ConfigPath
    )

    Clear-ExitedManagedProcess $Key

    if (-not $cloudflaredExe -or -not (Test-Path $cloudflaredExe)) {
        Write-Log "$Label skipped because cloudflared.exe was not found."
        return
    }

    if (-not (Test-Path $ConfigPath)) {
        Write-Log "$Label missing config at $ConfigPath."
        return
    }

    if (Test-ProcessCommandRunning @('cloudflared', 'tunnel', 'run', $TunnelId) -or (Test-ManagedProcessRunning $Key)) {
        return
    }

    Write-Log "$Label launching."
    Start-ManagedProcess `
        -Key $Key `
        -Label $Label `
        -FileName $cloudflaredExe `
        -Arguments "tunnel --config `"$ConfigPath`" run $TunnelId"
}

function Ensure-ProductionTunnelMaterial {
    $originUrl = "http://127.0.0.1:$prodPort"
    $configText = ''
    if (Test-Path $prodTunnelConfig) {
        try {
            $configText = Get-Content $prodTunnelConfig -Raw -ErrorAction Stop
        } catch {
            $configText = ''
        }
    }

    $configMatchesTunnel = (
        -not [string]::IsNullOrWhiteSpace($configText) -and
        $configText.Contains($prodTunnelId) -and
        $configText.Contains('app.cheflowhq.com') -and
        $configText.Contains('cheflowhq.com') -and
        $configText.Contains("service: $originUrl")
    )

    if ($configMatchesTunnel -and (Test-Path $prodTunnelCredential)) {
        return $true
    }

    if (-not (Test-Path $prodTunnelBootstrap)) {
        Write-Log "[prod-tunnel] Bootstrap script missing at $prodTunnelBootstrap."
        return $false
    }

    $arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$prodTunnelBootstrap`" -TunnelId `"$prodTunnelId`" -OriginUrl `"$originUrl`" -ConfigPath `"$prodTunnelConfig`" -ForceConfig"

    try {
        $process = Start-Process `
            -FilePath $powershellExe `
            -ArgumentList $arguments `
            -WorkingDirectory $projectDir `
            -WindowStyle Hidden `
            -Wait `
            -PassThru

        if ($process.ExitCode -ne 0) {
            Write-Log "[prod-tunnel] Bootstrap failed with exit code $($process.ExitCode)."
            return $false
        }
    } catch {
        Write-Log "[prod-tunnel] Bootstrap failed: $($_.Exception.Message)"
        return $false
    }

    return (Test-Path $prodTunnelConfig) -and (Test-Path $prodTunnelCredential)
}

function Repair-ProductionPublicEdgeIfNeeded {
    if ([datetime]::UtcNow -lt $script:publicEdgeCooldownUntil) {
        return
    }

    $originHealthUrl = "http://127.0.0.1:$prodPort/api/health/ping"
    if (-not (Test-HttpHealthy -Url $originHealthUrl)) {
        $script:publicEdgeFailureCount = 0
        return
    }

    $appHealthy = Test-HttpHealthy -Url $publicAppHealthUrl
    $rootHealthy = Test-HttpHealthy -Url $publicRootUrl

    if ($appHealthy -or $rootHealthy) {
        if ($script:publicEdgeFailureCount -gt 0) {
            Write-Log '[prod-tunnel] Public edge recovered before restart threshold.'
        }
        $script:publicEdgeFailureCount = 0
        return
    }

    $script:publicEdgeFailureCount++
    Write-Log "[prod-tunnel] Public edge unhealthy while origin is healthy (consecutive failures=$($script:publicEdgeFailureCount))."

    if ($script:publicEdgeFailureCount -lt 2) {
        return
    }

    $tunnelProcesses = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
        Where-Object {
            $_.Name -eq 'cloudflared.exe' -and
            -not [string]::IsNullOrWhiteSpace([string]$_.CommandLine) -and
            ([string]$_.CommandLine).Contains($prodTunnelId)
        }

    foreach ($tunnelProcess in $tunnelProcesses) {
        try {
            Stop-Process -Id $tunnelProcess.ProcessId -Force -ErrorAction Stop
            Write-Log "[prod-tunnel] Recycled unhealthy tunnel process PID $($tunnelProcess.ProcessId)."
        } catch {
            Write-Log "[prod-tunnel] Failed to stop tunnel PID $($tunnelProcess.ProcessId): $($_.Exception.Message)"
        }
    }

    if ($script:managedProcesses.ContainsKey('prodTunnel')) {
        $script:managedProcesses.Remove('prodTunnel')
    }

    Start-Sleep -Seconds 2
    Ensure-CloudflaredTunnelRunning `
        -Key 'prodTunnel' `
        -Label '[prod-tunnel] Production Cloudflare tunnel' `
        -TunnelId $prodTunnelId `
        -ConfigPath $prodTunnelConfig

    $script:publicEdgeFailureCount = 0
    $script:publicEdgeCooldownUntil = [datetime]::UtcNow.AddMinutes(10)
}

Write-Log '=== ChefFlow Watchdog Started ==='
Ensure-OllamaRunning
Ensure-MissionControlRunning
Ensure-MissionControlTrayRunning

$loopCount = 0

while ($true) {
    $loopCount++

    if ($loopCount % 10 -eq 0) {
        Ensure-OllamaRunning
    }

    if ($loopCount % 6 -eq 0) {
        Ensure-MissionControlRunning
        Ensure-MissionControlTrayRunning
    }

    Ensure-ProdServerRunning
    if (Ensure-ProductionTunnelMaterial) {
        Ensure-CloudflaredTunnelRunning `
            -Key 'prodTunnel' `
            -Label '[prod-tunnel] Production Cloudflare tunnel' `
            -TunnelId $prodTunnelId `
            -ConfigPath $prodTunnelConfig

        if ($loopCount % 4 -eq 0) {
            Repair-ProductionPublicEdgeIfNeeded
        }
    }

    if ($devPort -ne $prodPort) {
        Ensure-DevServerRunning
    }
    # Beta server (port 3200) DISABLED 2026-04-09:
    # User runs single-environment only (see memory/feedback_single_app_version.md).
    # Beta was spawning a port 3200 server every 30 seconds, fighting cleanup
    # and occasionally flashing console windows. Not needed.
    # Ensure-BetaServerRunning
    # Ensure-CloudflaredTunnelRunning `
    #     -Key 'betaTunnel' `
    #     -Label '[beta-tunnel] Beta Cloudflare tunnel' `
    #     -TunnelId $betaTunnelId `
    #     -ConfigPath $betaTunnelConfig

    if ($SinglePass) {
        Write-Log '=== ChefFlow Watchdog Single Pass Complete ==='
        break
    }

    Start-Sleep -Seconds 30
}
