param(
    [string]$ProjectDir = "C:\Users\david\Documents\CFv1",
    [switch]$ForceSweep,
    [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$mutexName = "Global\ChefFlowLiveOpsGuardian"
$createdNew = $false
$script:guardianMutex = New-Object System.Threading.Mutex($true, $mutexName, [ref]$createdNew)
if (-not $createdNew) {
    exit 0
}
Register-EngineEvent PowerShell.Exiting -Action {
    try {
        $script:guardianMutex.ReleaseMutex()
    } catch {
    }
} | Out-Null

$logDir = Join-Path $ProjectDir 'logs'
$logFile = Join-Path $logDir 'live-ops-guardian.log'
$stateFile = Join-Path $logDir 'live-ops-guardian-state.json'
$latestFile = Join-Path $logDir 'live-ops-guardian-latest.json'
$alertFile = Join-Path $logDir 'live-ops-guardian-alert.txt'
$playwrightRoot = Join-Path $ProjectDir 'test-results\live-ops-guardian'

if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}
if (-not (Test-Path $playwrightRoot)) {
    New-Item -ItemType Directory -Path $playwrightRoot -Force | Out-Null
}

if ((Test-Path $logFile) -and (Get-Item $logFile).Length -gt 2MB) {
    Remove-Item "$logFile.old" -ErrorAction SilentlyContinue
    Rename-Item $logFile "$logFile.old" -ErrorAction SilentlyContinue
}

function Write-Log {
    param([string]$Message)
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $logFile -Value "[$ts] $Message"
}

function Test-TruthyValue {
    param([string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value)) {
        return $false
    }
    return @('1', 'true', 'yes', 'on') -contains $Value.Trim().ToLowerInvariant()
}

function ConvertTo-FlatJson {
    param([Parameter(Mandatory = $true)]$Value)
    return $Value | ConvertTo-Json -Depth 8
}

function Read-JsonFile {
    param([string]$Path)
    if (-not (Test-Path $Path)) {
        return $null
    }
    try {
        return Get-Content $Path -Raw | ConvertFrom-Json
    } catch {
        Write-Log "Could not parse JSON from ${Path}: $($_.Exception.Message)"
        return $null
    }
}

function Test-JsonProperty {
    param(
        [Parameter(Mandatory = $true)]$Object,
        [Parameter(Mandatory = $true)][string]$Name
    )

    if ($null -eq $Object) {
        return $false
    }

    return $Object.PSObject.Properties.Name -contains $Name
}

function Get-JsonPropertyValue {
    param(
        [Parameter(Mandatory = $true)]$Object,
        [Parameter(Mandatory = $true)][string]$Name,
        $Default = $null
    )

    if (Test-JsonProperty -Object $Object -Name $Name) {
        return $Object.$Name
    }

    return $Default
}

function Get-StringHash {
    param([string]$Value)
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($Value)
        $hashBytes = $sha.ComputeHash($bytes)
        return ([System.BitConverter]::ToString($hashBytes)).Replace('-', '').ToLowerInvariant()
    } finally {
        $sha.Dispose()
    }
}

function Test-LocalUrl {
    param(
        [string]$Url,
        [string]$Path = '/api/health/ping'
    )

    try {
        $resp = Invoke-WebRequest -Uri "$Url$Path" -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
        return [pscustomobject]@{
            ok = $true
            statusCode = [int]$resp.StatusCode
            error = $null
        }
    } catch {
        $statusCode = 0
        if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
            $statusCode = [int]$_.Exception.Response.StatusCode
        }
        return [pscustomobject]@{
            ok = $false
            statusCode = $statusCode
            error = $_.Exception.Message
        }
    }
}

function Resolve-Target {
    $candidates = @()

    if (-not [string]::IsNullOrWhiteSpace($env:LIVE_OPS_BASE_URL)) {
        $candidates += [pscustomobject]@{ label = 'override'; baseUrl = $env:LIVE_OPS_BASE_URL.TrimEnd('/') }
    }

    $candidates += @(
        [pscustomobject]@{ label = 'dev'; baseUrl = 'http://localhost:3100' },
        [pscustomobject]@{ label = 'prod'; baseUrl = 'http://localhost:3000' },
        [pscustomobject]@{ label = 'beta'; baseUrl = 'http://localhost:3200' }
    )

    $seen = New-Object System.Collections.Generic.HashSet[string]
    foreach ($candidate in $candidates) {
        if (-not $seen.Add($candidate.baseUrl)) {
            continue
        }
        $probe = Test-LocalUrl -Url $candidate.baseUrl
        if ($probe.ok -and $probe.statusCode -lt 500) {
            return [pscustomobject]@{
                label = $candidate.label
                baseUrl = $candidate.baseUrl
            }
        }
    }

    return $null
}

function Get-ChangedPaths {
    try {
        $raw = & git -C $ProjectDir status --porcelain 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Log 'git status --porcelain failed; continuing without repo diff awareness.'
            return @()
        }
    } catch {
        Write-Log "git status failed: $($_.Exception.Message)"
        return @()
    }

    $paths = New-Object System.Collections.Generic.List[string]
    foreach ($line in $raw) {
        if ([string]::IsNullOrWhiteSpace($line)) {
            continue
        }
        if ($line.Length -lt 4) {
            continue
        }

        $path = $line.Substring(3).Trim()
        if ($path -match ' -> ') {
            $path = ($path -split ' -> ')[-1].Trim()
        }
        if (-not [string]::IsNullOrWhiteSpace($path)) {
            $paths.Add($path.Replace('\', '/'))
        }
    }

    return $paths.ToArray()
}

function Test-PathMatch {
    param(
        [string[]]$Paths,
        [string[]]$Regexes
    )

    foreach ($path in $Paths) {
        foreach ($regex in $Regexes) {
            if ($path -match $regex) {
                return $true
            }
        }
    }
    return $false
}

function Invoke-Step {
    param(
        [string]$Name,
        [string]$FilePath,
        [string[]]$Arguments,
        [hashtable]$Environment = @{}
    )

    Write-Log "STEP [$Name] starting: $FilePath $($Arguments -join ' ')"

    if ($DryRun) {
        return [pscustomobject]@{
            name = $Name
            status = 'dry-run'
            exitCode = 0
            durationSeconds = 0
        }
    }

    $previousEnv = @{}
    foreach ($key in $Environment.Keys) {
        $previousEnv[$key] = [Environment]::GetEnvironmentVariable($key, 'Process')
        [Environment]::SetEnvironmentVariable($key, [string]$Environment[$key], 'Process')
    }

    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    $exitCode = 0

    try {
        Push-Location $ProjectDir
        & $FilePath @Arguments *>> $logFile
        if ($null -ne $LASTEXITCODE) {
            $exitCode = [int]$LASTEXITCODE
        }
    } catch {
        $exitCode = 1
        $_ | Out-String | Add-Content -Path $logFile
    } finally {
        try {
            Pop-Location
        } catch {
        }
        foreach ($key in $Environment.Keys) {
            [Environment]::SetEnvironmentVariable($key, $previousEnv[$key], 'Process')
        }
        $stopwatch.Stop()
    }

    $status = if ($exitCode -eq 0) { 'passed' } else { 'failed' }
    Write-Log "STEP [$Name] $status in $([math]::Round($stopwatch.Elapsed.TotalSeconds, 1))s"

    return [pscustomobject]@{
        name = $Name
        status = $status
        exitCode = $exitCode
        durationSeconds = [math]::Round($stopwatch.Elapsed.TotalSeconds, 1)
    }
}

$runId = "live-ops-$($PID)-$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())"
$state = Read-JsonFile -Path $stateFile
$changedPaths = Get-ChangedPaths
$fingerprint = Get-StringHash -Value (($changedPaths | Sort-Object) -join "`n")
$lastEvaluatedFingerprint = if ($state) { [string](Get-JsonPropertyValue -Object $state -Name 'lastEvaluatedFingerprint' -Default '') } else { '' }
$newChangesDetected = $ForceSweep.IsPresent -or ($fingerprint -ne $lastEvaluatedFingerprint)

$periodicSweepHours = 6
if (-not [string]::IsNullOrWhiteSpace($env:LIVE_OPS_PERIODIC_SWEEP_HOURS)) {
    $parsedHours = 0
    if ([int]::TryParse($env:LIVE_OPS_PERIODIC_SWEEP_HOURS, [ref]$parsedHours) -and $parsedHours -gt 0) {
        $periodicSweepHours = $parsedHours
    }
}

$lastTestSweepAt = $null
if ($state -and (Test-JsonProperty -Object $state -Name 'lastTestSweepAt')) {
    try {
        $lastTestSweepAt = [datetime]::Parse((Get-JsonPropertyValue -Object $state -Name 'lastTestSweepAt'))
    } catch {
        $lastTestSweepAt = $null
    }
}

$periodicDue = $ForceSweep.IsPresent -or -not $lastTestSweepAt -or (([datetime]::UtcNow - $lastTestSweepAt.ToUniversalTime()).TotalHours -ge $periodicSweepHours)

$target = Resolve-Target
$probeUrls = @()
if ($target) {
    $probeUrls += @(
        [pscustomobject]@{ name = 'health-ping'; path = '/api/health/ping' },
        [pscustomobject]@{ name = 'health-readiness'; path = '/api/health/readiness?strict=1' },
        [pscustomobject]@{ name = 'home'; path = '/' },
        [pscustomobject]@{ name = 'signin'; path = '/auth/signin' }
    )
}

$probeResults = New-Object System.Collections.Generic.List[object]
foreach ($probe in $probeUrls) {
    $probeResult = Test-LocalUrl -Url $target.baseUrl -Path $probe.path
    $probeResults.Add([pscustomobject]@{
        name = $probe.name
        path = $probe.path
        ok = $probeResult.ok
        statusCode = $probeResult.statusCode
        error = $probeResult.error
    })
}

$publicLaunch = Test-PathMatch -Paths $changedPaths -Regexes @(
    '^app/\(public\)/',
    '^app/\(bare\)/',
    '^components/public/',
    '^public/',
    '^app/robots\.ts$',
    '^app/sitemap\.ts$',
    '^lib/discover/',
    '^lib/marketing/'
)
$publicInquiry = Test-PathMatch -Paths $changedPaths -Regexes @(
    '^app/\(public\)/(book|nearby|discover)/',
    '^app/\(bare\)/(nearby|discover)/',
    '^lib/discover/',
    '^components/.+inquir',
    '^components/.+listing'
)
$settingsLaunch = Test-PathMatch -Paths $changedPaths -Regexes @(
    '^app/\(chef\)/settings/',
    '^components/settings/',
    '^settings/',
    '^lib/help/page-info-sections/19-chef-portal-settings\.ts$'
)
$clientLaunch = Test-PathMatch -Paths $changedPaths -Regexes @(
    '^app/\(client\)/',
    '^components/clients/',
    '^components/client/'
)
$authLaunch = Test-PathMatch -Paths $changedPaths -Regexes @(
    '^app/auth/',
    '^app/api/auth/',
    '^lib/auth/',
    '^middleware\.ts$',
    '^app/layout\.tsx$',
    '^app/\(chef\)/layout\.tsx$',
    '^app/\(client\)/layout\.tsx$'
)
$unitCanary = $newChangesDetected -or $periodicDue
$authSweepsEnabled = Test-TruthyValue -Value $env:LIVE_OPS_ENABLE_AUTH_SWEEPS
$authSeedAllowed = (Test-TruthyValue -Value $env:DATABASE_E2E_ALLOW_REMOTE) -or (Test-TruthyValue -Value $env:DATABASE_E2E_ALLOW_LOCAL)
$publicLaunchDue = $target -and ($periodicDue -or ($newChangesDetected -and ($publicLaunch -or $authLaunch)))
$publicInquiryDue = $target -and ($periodicDue -or ($newChangesDetected -and $publicInquiry))
$settingsLaunchDue = $target -and $authSweepsEnabled -and $authSeedAllowed -and ($periodicDue -or ($newChangesDetected -and $settingsLaunch))
$clientLaunchDue = $target -and $authSweepsEnabled -and $authSeedAllowed -and ($periodicDue -or ($newChangesDetected -and $clientLaunch))
$seedIdsPath = Join-Path $ProjectDir '.auth\seed-ids.json'
$notes = New-Object System.Collections.Generic.List[string]
$targetDisplay = if ($target) { $target.baseUrl } else { 'unavailable' }

if ($settingsLaunch -or $clientLaunch -or $authLaunch) {
    if (-not $authSweepsEnabled) {
        $notes.Add('Auth-sensitive changes detected, but LIVE_OPS_ENABLE_AUTH_SWEEPS is disabled.')
    } elseif (-not $authSeedAllowed) {
        $notes.Add('Auth-sensitive changes detected, but DATABASE_E2E_ALLOW_REMOTE/LOCAL is not enabled for test seeding.')
    }
}

$steps = New-Object System.Collections.Generic.List[object]

if ($unitCanary) {
    $steps.Add([pscustomobject]@{
        name = 'unit-canary'
        filePath = 'node'
        arguments = @(
            '--test',
            '--import',
            'tsx',
            'tests/unit/api.health-route.test.ts',
            'tests/unit/api.readiness-route.test.ts',
            'tests/unit/cron-monitoring-coverage.test.ts'
        )
        environment = @{}
    })
}

if ($publicLaunchDue) {
    $steps.Add([pscustomobject]@{
        name = 'launch-public'
        filePath = 'npx.cmd'
        arguments = @(
            'playwright',
            'test',
            '--project=launch-public',
            'tests/launch/02-public-pages.spec.ts'
        )
        environment = @{
            PLAYWRIGHT_BASE_URL = $target.baseUrl
            PLAYWRIGHT_REUSE_SERVER = 'true'
            PLAYWRIGHT_SKIP_AUTH_BOOTSTRAP = 'true'
            PLAYWRIGHT_RUN_ID = $runId
            PLAYWRIGHT_OUTPUT_DIR = (Join-Path $playwrightRoot $runId)
        }
    })
}

if ($publicInquiryDue) {
    if (Test-Path $seedIdsPath) {
        $steps.Add([pscustomobject]@{
            name = 'launch-public-inquiry'
            filePath = 'npx.cmd'
            arguments = @(
                'playwright',
                'test',
                '--project=launch-public',
                'tests/launch/14-public-inquiry-form.spec.ts'
            )
            environment = @{
                PLAYWRIGHT_BASE_URL = $target.baseUrl
                PLAYWRIGHT_REUSE_SERVER = 'true'
                PLAYWRIGHT_SKIP_AUTH_BOOTSTRAP = 'true'
                PLAYWRIGHT_RUN_ID = $runId
                PLAYWRIGHT_OUTPUT_DIR = (Join-Path $playwrightRoot $runId)
            }
        })
    } else {
        $notes.Add('Skipped public inquiry sweep because .auth/seed-ids.json is missing.')
    }
}

if ($settingsLaunchDue) {
    $steps.Add([pscustomobject]@{
        name = 'launch-settings'
        filePath = 'npx.cmd'
        arguments = @(
            'playwright',
            'test',
            '--project=launch-chef',
            'tests/launch/15-settings-and-modules.spec.ts'
        )
        environment = @{
            PLAYWRIGHT_BASE_URL = $target.baseUrl
            PLAYWRIGHT_REUSE_SERVER = 'true'
            PLAYWRIGHT_RUN_ID = $runId
            PLAYWRIGHT_OUTPUT_DIR = (Join-Path $playwrightRoot $runId)
        }
    })
}

if ($clientLaunchDue) {
    $steps.Add([pscustomobject]@{
        name = 'launch-client-portal'
        filePath = 'npx.cmd'
        arguments = @(
            'playwright',
            'test',
            '--project=launch-client',
            'tests/launch/13-client-portal.spec.ts'
        )
        environment = @{
            PLAYWRIGHT_BASE_URL = $target.baseUrl
            PLAYWRIGHT_REUSE_SERVER = 'true'
            PLAYWRIGHT_RUN_ID = $runId
            PLAYWRIGHT_OUTPUT_DIR = (Join-Path $playwrightRoot $runId)
        }
    })
}

$uniqueSteps = @{}
$finalSteps = New-Object System.Collections.Generic.List[object]
foreach ($step in $steps) {
    if ($uniqueSteps.ContainsKey($step.name)) {
        continue
    }
    $uniqueSteps[$step.name] = $true
    $finalSteps.Add($step)
}

Write-Log "Live Ops Guardian run $runId starting. Target=$targetDisplay NewChanges=$newChangesDetected PeriodicDue=$periodicDue Paths=$($changedPaths.Count)"

$results = New-Object System.Collections.Generic.List[object]
foreach ($step in $finalSteps) {
    $results.Add((Invoke-Step -Name $step.name -FilePath $step.filePath -Arguments $step.arguments -Environment $step.environment))
}

$failureCount = @($results | Where-Object { $_.status -eq 'failed' }).Count
$failedStepNames = @($results | Where-Object { $_.status -eq 'failed' } | ForEach-Object { $_.name })
$previousFailedSteps = @()
if ($state -and (Test-JsonProperty -Object $state -Name 'lastFailedSteps')) {
    $previousFailedSteps = @((Get-JsonPropertyValue -Object $state -Name 'lastFailedSteps'))
}
$failureSignatureChanged = ((($failedStepNames | Sort-Object) -join ',') -ne (($previousFailedSteps | Sort-Object) -join ','))
$status = if ($failureCount -eq 0) { 'ok' } else { 'needs-attention' }

$summary = [ordered]@{
    runId = $runId
    ranAt = [datetime]::UtcNow.ToString('o')
    target = if ($target) { [ordered]@{ label = $target.label; baseUrl = $target.baseUrl } } else { $null }
    newChangesDetected = $newChangesDetected
    periodicSweepDue = $periodicDue
    authSweepsEnabled = $authSweepsEnabled
    changedPathCount = $changedPaths.Count
    changedPaths = $changedPaths
    healthProbes = $probeResults
    steps = $results
    notes = $notes
    failureCount = $failureCount
    status = $status
}

ConvertTo-FlatJson -Value $summary | Set-Content -Path $latestFile

$nextState = [ordered]@{
    lastEvaluatedFingerprint = $fingerprint
    lastRunId = $runId
    lastStatus = $status
    lastFailedSteps = $failedStepNames
    lastBaseUrl = if ($target) { $target.baseUrl } else { $null }
    lastCheckedAt = [datetime]::UtcNow.ToString('o')
    lastTestSweepAt = if ($finalSteps.Count -gt 0) { [datetime]::UtcNow.ToString('o') } elseif ($state -and (Test-JsonProperty -Object $state -Name 'lastTestSweepAt')) { Get-JsonPropertyValue -Object $state -Name 'lastTestSweepAt' } else { $null }
}
ConvertTo-FlatJson -Value $nextState | Set-Content -Path $stateFile

$shouldAlert = $failureCount -gt 0 -and (
    $newChangesDetected -or
    $failureSignatureChanged -or
    (($state -and [string](Get-JsonPropertyValue -Object $state -Name 'lastStatus' -Default '') -ne 'needs-attention') -or (-not $state))
)

if ($failureCount -gt 0) {
    $alertBody = @(
        "Live Ops Guardian found $failureCount failing check(s).",
        "Run: $runId",
        "Target: $targetDisplay",
        "Failures: $((@($results | Where-Object { $_.status -eq 'failed' } | ForEach-Object { $_.name })) -join ', ')",
        "Latest summary: $latestFile"
    ) -join [Environment]::NewLine

    $alertBody | Set-Content -Path $alertFile

    if (-not $DryRun -and $shouldAlert) {
        [System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null
        $balloon = New-Object System.Windows.Forms.NotifyIcon
        $balloon.Icon = [System.Drawing.SystemIcons]::Warning
        $balloon.Visible = $true
        $balloon.ShowBalloonTip(10000, "ChefFlow Live Ops Guardian", $alertBody, [System.Windows.Forms.ToolTipIcon]::Warning)
        Start-Sleep -Seconds 2
        $balloon.Dispose()
    }
} else {
    Remove-Item $alertFile -ErrorAction SilentlyContinue
}

Write-Log "Live Ops Guardian run $runId finished with status=$status failures=$failureCount"
