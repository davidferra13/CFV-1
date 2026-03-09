# Variant Test Completion Notification
# Monitors for test completion and shows a popup + plays sound notification

$TestDir = "c:/Users/david/Documents/CFv1/data/stress-reports"
$MaxWaitSeconds = 7500  # 2 hours + 5 min buffer
$CheckInterval = 30     # Check every 30 seconds

Write-Host "🔔 Variant Test Notification Monitor Started"
Write-Host "Will notify when test completes..."
Write-Host ""

$StartTime = Get-Date
$LastTotal = 0

while ((Get-Date) - $StartTime -lt [TimeSpan]::FromSeconds($MaxWaitSeconds)) {
    # Find most recent sustained test
    $LatestReport = Get-ChildItem -Path $TestDir -Filter "ollama-stress-sustained-*.json" -ErrorAction SilentlyContinue |
                    Sort-Object LastWriteTime -Descending |
                    Select-Object -First 1

    if ($null -ne $LatestReport) {
        $ReportJson = Get-Content $LatestReport.FullName | ConvertFrom-Json
        $Total = $ReportJson.results.total
        $SuccessRate = $ReportJson.results.successRate
        $Errors = $ReportJson.results.errors

        # Show progress every 500 requests
        if ($Total -gt $LastTotal + 500) {
            $ProgressPercent = [math]::Min(100, [math]::Round(($Total / 15000) * 100))
            Write-Host "[$([DateTime]::Now.ToString('HH:mm:ss'))] $Total requests | $ProgressPercent% estimated | Success: $('{0:P1}' -f $SuccessRate) | Errors: $Errors"
            $LastTotal = $Total
        }
    }

    # Check if test is still running
    $PlaywrightRunning = Get-Process | Where-Object { $_.ProcessName -like "*playwright*" -or $_.CommandLine -like "*playwright*" } -ErrorAction SilentlyContinue

    if ($null -eq $PlaywrightRunning) {
        Write-Host ""
        Write-Host "════════════════════════════════════════════════════════════════"
        Write-Host "VARIANT TEST COMPLETED!"
        Write-Host "════════════════════════════════════════════════════════════════"
        Write-Host "Completion time: $(Get-Date)"
        Write-Host ""

        # Show popup notification
        [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications.ToastNotification, Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlElement] > $null

        try {
            $APP_ID = 'ChefFlow.VariantTest'

            # Create toast notification XML
            $template = @"
<toast duration="long">
    <visual>
        <binding template="ToastText02">
            <text id="1">Variant Test Complete!</text>
            <text id="2">12 concurrent users, 2 hours sustained load finished. Results ready for analysis.</text>
        </binding>
    </visual>
    <audio src="ms-winsoundevent:Notification.Default" />
</toast>
"@

            $xml = New-Object Windows.Data.Xml.Dom.XmlDocument
            $xml.LoadXml($template)
            $toast = New-Object Windows.UI.Notifications.ToastNotification $xml
            $notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($APP_ID)
            $notifier.Show($toast)

            Write-Host "✓ Popup notification sent"
        }
        catch {
            Write-Host "⚠ Could not show system notification (non-critical): $_"
        }

        # Also create a visual file marker
        $MarkerFile = "$TestDir/VARIANT_TEST_COMPLETE_$(Get-Date -Format 'yyyyMMdd-HHmmss').txt"
        @"
Variant Test Completion Marker
Time: $(Get-Date)
Test Config: 12 concurrent users
Duration: 2 hours
Status: COMPLETE - Results ready for analysis

Next steps:
1. Analyze results with: bash analyze-variant-results.sh
2. Compare with baseline (Iteration 1) results
3. Assess generalization success
"@ | Out-File -FilePath $MarkerFile -Encoding UTF8

        Write-Host "✓ Marker file created: $(Split-Path $MarkerFile -Leaf)"
        Write-Host ""
        break
    }

    Start-Sleep -Seconds $CheckInterval
}

if ((Get-Date) - $StartTime -ge [TimeSpan]::FromSeconds($MaxWaitSeconds)) {
    Write-Host "⚠ Timeout: Test monitoring exceeded maximum wait time"
}
