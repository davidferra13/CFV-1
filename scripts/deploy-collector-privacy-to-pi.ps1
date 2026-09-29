param(
  [string]$PiHost = 'davidferra@10.0.0.176',
  [string]$PiDir = '/home/davidferra/openclaw-prices'
)

$ErrorActionPreference = 'Stop'
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
if ($PiHost -notmatch '^[A-Za-z0-9_.@:-]+$') { throw 'Unsafe PiHost value.' }
if ($PiDir -notmatch '^/[A-Za-z0-9_./-]+$') { throw 'Unsafe PiDir value.' }

$Files = @(
  '.openclaw-build/lib/collector-policy.mjs',
  '.openclaw-build/lib/scrape-utils.mjs',
  '.openclaw-build/services/price-intelligence-daemon.mjs',
  '.openclaw-build/services/scraper-walmart-nationwide.mjs',
  '.openclaw-build/scripts/schedule-all.sh',
  '.openclaw-build/tests/collector-policy.test.mjs'
)

function Test-SshPort {
  $hostPart = ($PiHost -split '@')[-1]
  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $async = $client.BeginConnect($hostPart, 22, $null, $null)
    if (-not $async.AsyncWaitHandle.WaitOne(2500, $false)) { return $false }
    $client.EndConnect($async)
    return $client.Connected
  } catch {
    return $false
  } finally {
    $client.Close()
  }
}

function Invoke-Ssh([string]$Command) {
  & ssh -o BatchMode=yes -o ConnectTimeout=6 $PiHost $Command
  if ($LASTEXITCODE -ne 0) { throw "SSH authentication or command failed for $PiHost." }
}
Write-Output "Checking $PiHost..."
if (-not (Test-SshPort)) { throw "Pi SSH port is not reachable at $PiHost." }
Invoke-Ssh "test -d '$PiDir' && echo PI_RUNTIME_FOUND"

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$stage = "$PiDir/.privacy-stage-$stamp"
$backup = "$PiDir/.privacy-backup-$stamp"
Invoke-Ssh "mkdir -p '$stage/lib' '$stage/services' '$stage/scripts' '$stage/tests' '$backup'"

foreach ($relative in $Files) {
  $local = Join-Path $RepoRoot $relative
  if (-not (Test-Path $local)) { throw "Missing local deployment file: $relative" }
  $leaf = Split-Path $relative -Leaf
  if ($relative -like '*/lib/*') { $remoteSubdir = 'lib' }
  elseif ($relative -like '*/services/*') { $remoteSubdir = 'services' }
  elseif ($relative -like '*/scripts/*') { $remoteSubdir = 'scripts' }
  else { $remoteSubdir = 'tests' }
  $remote = $PiHost + ':' + $stage + '/' + $remoteSubdir + '/' + $leaf
  & scp -q -o BatchMode=yes -o ConnectTimeout=6 $local $remote
  if ($LASTEXITCODE -ne 0) { throw "SCP failed: $relative" }
}
Write-Output 'Validating staged files...'
Invoke-Ssh "cd '$stage' && node --check lib/collector-policy.mjs && node --check lib/scrape-utils.mjs && node --check services/price-intelligence-daemon.mjs && node --check services/scraper-walmart-nationwide.mjs && bash -n scripts/schedule-all.sh && node --test tests/collector-policy.test.mjs"

Write-Output "Backing up and promoting into $PiDir..."
foreach ($relative in $Files) {
  $target = $relative -replace '^\.openclaw-build/', ''
  $targetDir = [System.IO.Path]::GetDirectoryName($target).Replace('\', '/')
  $remoteCommand = "cd '$PiDir' && mkdir -p '$backup/$targetDir' '$targetDir' && if [ -f '$target' ]; then cp -p '$target' '$backup/$target'; fi && cp '$stage/$target' '$target'"
  Invoke-Ssh $remoteCommand
}

Invoke-Ssh "cd '$PiDir' && chmod +x scripts/schedule-all.sh && node --test tests/collector-policy.test.mjs && bash -n scripts/schedule-all.sh"
Write-Output 'Checking privacy activation state...'
Invoke-Ssh "cd '$PiDir' && env | grep '^OPENCLAW_EGRESS_PROFILE=isolated$' || echo DIRECT_SCRAPERS_REMAIN_FAIL_CLOSED"
Write-Output "Pi privacy boundary deployed. Backup preserved at $backup"
