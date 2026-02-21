$url = 'http://127.0.0.1:11434/api/chat'
$req = [System.Net.HttpWebRequest]::Create($url)
$req.Method = 'POST'
$req.ContentType = 'application/json'
$req.Timeout = 120000

$payload = '{"model":"qwen3-coder:30b","messages":[{"role":"user","content":"Say only: OK"}],"stream":false}'
$body = [System.Text.Encoding]::UTF8.GetBytes($payload)
$req.ContentLength = $body.Length
$stream = $req.GetRequestStream()
$stream.Write($body, 0, $body.Length)
$stream.Close()

Write-Output 'Sending test to Ollama...'
try {
    $resp = $req.GetResponse()
    $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
    $result = $reader.ReadToEnd()
    Write-Output $result
    $resp.Close()
} catch {
    Write-Output ('FAIL: ' + $_.Exception.Message)
}
