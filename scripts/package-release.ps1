param(
  [string]$Commit = "HEAD",
  [string]$OutputDir = "dist\self-hosted-releases",
  [string]$ReleaseId = "",
  [switch]$IncludeDirty
)

$ErrorActionPreference = "Stop"

function Invoke-Git {
  param([string[]]$GitArgs)
  $output = & git @GitArgs
  if ($LASTEXITCODE -ne 0) {
    throw "git $($GitArgs -join ' ') failed."
  }
  return $output
}

$repoRoot = (Invoke-Git -GitArgs @("rev-parse", "--show-toplevel")).Trim()
Set-Location $repoRoot

$resolvedCommit = (Invoke-Git -GitArgs @("rev-parse", $Commit)).Trim()
$shortSha = (Invoke-Git -GitArgs @("rev-parse", "--short=12", $resolvedCommit)).Trim()
$dirtyState = (Invoke-Git -GitArgs @("status", "--porcelain")).Trim()

if ($dirtyState -and -not $IncludeDirty) {
  throw "Working tree is dirty. Commit first or pass -IncludeDirty to package the current tracked snapshot."
}

$timestamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
if (-not $ReleaseId) {
  $suffix = if ($IncludeDirty) { "dirty" } else { $shortSha }
  $ReleaseId = "$timestamp-$suffix"
}

$absoluteOutputDir = if ([System.IO.Path]::IsPathRooted($OutputDir)) {
  $OutputDir
} else {
  Join-Path $repoRoot $OutputDir
}
New-Item -ItemType Directory -Force -Path $absoluteOutputDir | Out-Null

$stagingRoot = Join-Path ([System.IO.Path]::GetTempPath()) "chefflow-release-$ReleaseId"
if (Test-Path $stagingRoot) {
  Remove-Item -LiteralPath $stagingRoot -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $stagingRoot | Out-Null

try {
  if ($IncludeDirty) {
    $tracked = (& git ls-files -z) -split "`0" | Where-Object { $_ }
    $untracked = (& git ls-files --others --exclude-standard -z) -split "`0" | Where-Object { $_ }
    foreach ($relativePath in @($tracked + $untracked)) {
      $source = Join-Path $repoRoot $relativePath
      if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
        continue
      }
      $destination = Join-Path $stagingRoot $relativePath
      New-Item -ItemType Directory -Force -Path (Split-Path -Parent $destination) | Out-Null
      Copy-Item -LiteralPath $source -Destination $destination
    }
  } else {
    $archiveTar = Join-Path $stagingRoot "source.tar"
    & git archive --format=tar --output $archiveTar $resolvedCommit
    if ($LASTEXITCODE -ne 0) {
      throw "git archive failed."
    }
    & tar -xf $archiveTar -C $stagingRoot
    if ($LASTEXITCODE -ne 0) {
      throw "tar extraction failed."
    }
    Remove-Item -LiteralPath $archiveTar -Force
  }

  $metadata = [ordered]@{
    releaseId = $ReleaseId
    commit = $resolvedCommit
    shortSha = $shortSha
    packagedAt = (Get-Date).ToUniversalTime().ToString("o")
    packagedBy = $env:USERNAME
    source = if ($IncludeDirty) { "working-tree-snapshot" } else { "git-commit" }
    dirty = [bool]$IncludeDirty
  }
  $metadataPath = Join-Path $stagingRoot ".chefflow-release.json"
  $metadata | ConvertTo-Json -Depth 4 | Set-Content -Encoding UTF8 $metadataPath

  $archivePath = Join-Path $absoluteOutputDir "$ReleaseId.tar.gz"
  if (Test-Path $archivePath) {
    throw "Release archive already exists: $archivePath"
  }

  & tar -czf $archivePath -C $stagingRoot .
  if ($LASTEXITCODE -ne 0) {
    throw "tar packaging failed."
  }

  Write-Host "Packaged ChefFlow release"
  Write-Host "Release ID : $ReleaseId"
  Write-Host "Commit     : $resolvedCommit"
  Write-Host "Archive    : $archivePath"
} finally {
  if (Test-Path $stagingRoot) {
    Remove-Item -LiteralPath $stagingRoot -Recurse -Force
  }
}
