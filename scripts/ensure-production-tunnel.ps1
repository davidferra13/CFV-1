param(
    [string]$TunnelId = '9dab6929-68e3-4775-9b8e-17482f714e83',
    [string]$OriginUrl = 'http://127.0.0.1:3100',
    [string]$ConfigPath = '',
    [switch]$ForceConfig
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($ConfigPath)) {
    $ConfigPath = Join-Path $env:USERPROFILE '.cloudflared\chefflow-prod.yml'
}

$configDir = Split-Path $ConfigPath -Parent
$credentialPath = Join-Path $configDir "$TunnelId.json"
$originCert = Join-Path $env:USERPROFILE '.cloudflared\cert.pem'
$templatePath = Join-Path (Split-Path $PSScriptRoot -Parent) '.cloudflared\chefflow-prod.yml.example'

$stableCloudflared = Join-Path $env:USERPROFILE 'Tools\cloudflared\cloudflared.exe'
$legacyCloudflared = Join-Path $env:APPDATA 'npm\node_modules\cloudflared\bin\cloudflared.exe'
$preferredCloudflared = if (Test-Path $stableCloudflared) { $stableCloudflared } else { $legacyCloudflared }
$cloudflared = if (Test-Path $preferredCloudflared) {
    $preferredCloudflared
} else {
    $command = Get-Command cloudflared -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($command) { $command.Source } else { $null }
}

if (-not $cloudflared -or -not (Test-Path $cloudflared)) {
    throw 'cloudflared executable was not found.'
}

if (-not (Test-Path $configDir)) {
    New-Item -ItemType Directory -Path $configDir -Force | Out-Null
}

if (-not (Test-Path $credentialPath)) {
    if (-not (Test-Path $originCert)) {
        throw "Named-tunnel credential is missing and Cloudflare origin certificate was not found at $originCert."
    }

    & $cloudflared tunnel token --cred-file $credentialPath $TunnelId | Out-Null
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path $credentialPath)) {
        throw "Failed to recover credential material for tunnel $TunnelId."
    }
}

if ($ForceConfig -or -not (Test-Path $ConfigPath)) {
    if (-not (Test-Path $templatePath)) {
        throw "Production tunnel template was not found at $templatePath."
    }

    $template = Get-Content $templatePath -Raw
    $credentialForYaml = $credentialPath.Replace("'", "''")
    $content = $template.
        Replace('<TUNNEL_ID>', $TunnelId).
        Replace('<CREDENTIALS_FILE>', $credentialForYaml).
        Replace('<ORIGIN_URL>', $OriginUrl)

    [System.IO.File]::WriteAllText(
        $ConfigPath,
        $content,
        (New-Object System.Text.UTF8Encoding($false))
    )
}

& $cloudflared tunnel --config $ConfigPath ingress validate | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw "Production tunnel config failed validation: $ConfigPath"
}

Write-Output "Production tunnel material ready: $ConfigPath"
