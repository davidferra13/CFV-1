$wc = New-Object System.Net.WebClient
$raw = $wc.DownloadString('http://127.0.0.1:11434/api/tags')
$parsed = $raw | ConvertFrom-Json
Write-Output ('Available models: ' + $parsed.models.Count)
foreach ($m in $parsed.models) {
    $gb = [math]::Round($m.size / 1GB, 1)
    Write-Output ('  ' + $m.name + ' - ' + $gb + ' GB - params: ' + $m.details.parameter_size)
}
