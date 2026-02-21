Add-Type -AssemblyName System.Web.Extensions
$base = 'http://127.0.0.1:3100'
$auth = 'Bearer SaltyPhish7!'

Write-Output 'Checking which tenants need a simulation run...'
$checkReq = [System.Net.HttpWebRequest]::Create("$base/api/scheduled/simulation/check")
$checkReq.Method = 'GET'
$checkReq.Headers.Add('Authorization', $auth)
$checkReq.Timeout = 30000

try {
    $checkResp = $checkReq.GetResponse()
    $checkJson = (New-Object System.IO.StreamReader($checkResp.GetResponseStream())).ReadToEnd()
    $checkResp.Close()
} catch {
    Write-Output ('Check failed: ' + $_.Exception.Message)
    exit 1
}

$js = New-Object System.Web.Script.Serialization.JavaScriptSerializer
$parsed = $js.DeserializeObject($checkJson)
$dueFor = $parsed['dueFor']

if ($null -eq $dueFor -or $dueFor.Count -eq 0) {
    Write-Output 'No tenants due — simulation is current.'
    exit 0
}

# Run one tenant at a time — prevents Ollama from being overwhelmed
$tenantId = $dueFor[0]
Write-Output ("Running simulation for tenant: $tenantId")

$simBody = $js.Serialize(@{ tenantIds = @($tenantId) })
$simReq = [System.Net.HttpWebRequest]::Create("$base/api/scheduled/simulation")
$simReq.Method = 'POST'
$simReq.Headers.Add('Authorization', $auth)
$simReq.ContentType = 'application/json'
$simReq.Timeout = 420000

$bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($simBody)
$simReq.ContentLength = $bodyBytes.Length
$s = $simReq.GetRequestStream()
$s.Write($bodyBytes, 0, $bodyBytes.Length)
$s.Close()

Write-Output 'Running — this takes about 3 minutes...'
try {
    $simResp = $simReq.GetResponse()
    $result = (New-Object System.IO.StreamReader($simResp.GetResponseStream())).ReadToEnd()
    $simResp.Close()
    Write-Output ''
    Write-Output '=== DONE ==='
    Write-Output $result
} catch {
    Write-Output ('FAILED: ' + $_.Exception.Message)
}
