# ═══════════════════════════════════════════════════════════════════
# ChefFlow Mission Control — System Tray Icon
# ═══════════════════════════════════════════════════════════════════
# Creates a system tray icon that:
#   - Shows ChefFlow status at a glance (green/yellow/red icon)
#   - Right-click menu: Open Dashboard, Start/Stop Dev, Restart Beta, Quit
#   - Lives in the taskbar next to NordVPN, Ditto, etc.
#
# Usage: powershell -WindowStyle Hidden -File scripts/launcher/tray.ps1
# ═══════════════════════════════════════════════════════════════════

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))
$serverPort = 3200
$devPort = 3100

# ── Create tray icon ────────────────────────────────────────────

$notifyIcon = New-Object System.Windows.Forms.NotifyIcon
$notifyIcon.Text = "ChefFlow Mission Control"
$notifyIcon.Visible = $true

# Create a simple colored icon (terracotta circle)
function New-StatusIcon([string]$color) {
    $bmp = New-Object System.Drawing.Bitmap(16, 16)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    switch ($color) {
        "green"   { $brush = [System.Drawing.Brushes]::LimeGreen; $pen = [System.Drawing.Pens]::DarkGreen }
        "yellow"  { $brush = [System.Drawing.Brushes]::Gold; $pen = [System.Drawing.Pens]::DarkGoldenrod }
        "red"     { $brush = [System.Drawing.Brushes]::Tomato; $pen = [System.Drawing.Pens]::DarkRed }
        default   { $brush = [System.Drawing.Brushes]::Orange; $pen = [System.Drawing.Pens]::OrangeRed }
    }

    # Draw the ChefFlow circle
    $g.FillEllipse($brush, 1, 1, 13, 13)
    $g.DrawEllipse($pen, 1, 1, 13, 13)
    $g.Dispose()

    return [System.Drawing.Icon]::FromHandle($bmp.GetHicon())
}

$notifyIcon.Icon = New-StatusIcon "orange"

# ── Helper functions ────────────────────────────────────────────

function Test-ServerRunning([int]$port) {
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $tcp.Connect("127.0.0.1", $port)
        $tcp.Close()
        return $true
    } catch {
        return $false
    }
}

function Start-DashboardServer {
    if (Test-ServerRunning $serverPort) { return }
    Start-Process -FilePath "node" -ArgumentList "scripts/launcher/server.mjs" `
        -WorkingDirectory $projectRoot -WindowStyle Hidden
}

function Open-Dashboard {
    Start-DashboardServer
    Start-Sleep -Seconds 1

    # Try Chrome app mode first
    $chrome = Get-Command chrome -ErrorAction SilentlyContinue
    if ($chrome) {
        Start-Process chrome "--app=http://localhost:$serverPort --window-size=1100,750 --window-position=2560,100"
    } else {
        Start-Process "http://localhost:$serverPort"
    }
}

function Invoke-API([string]$endpoint, [string]$method = "POST") {
    try {
        if ($method -eq "POST") {
            Invoke-WebRequest -Uri "http://localhost:$serverPort/api/$endpoint" `
                -Method POST -TimeoutSec 10 -UseBasicParsing | Out-Null
        } else {
            $response = Invoke-WebRequest -Uri "http://localhost:$serverPort/api/$endpoint" `
                -Method GET -TimeoutSec 10 -UseBasicParsing
            return ($response.Content | ConvertFrom-Json)
        }
    } catch {
        # Server might not be running
    }
}

# ── Build context menu ──────────────────────────────────────────

$contextMenu = New-Object System.Windows.Forms.ContextMenuStrip

# Open Dashboard
$menuOpen = $contextMenu.Items.Add("Open Mission Control")
$menuOpen.Font = New-Object System.Drawing.Font($menuOpen.Font, [System.Drawing.FontStyle]::Bold)
$menuOpen.Add_Click({ Open-Dashboard })

$contextMenu.Items.Add("-")  # Separator

# Dev Server
$menuDevStart = $contextMenu.Items.Add("Start Dev Server")
$menuDevStart.Add_Click({ Start-DashboardServer; Invoke-API "dev/start" })

$menuDevStop = $contextMenu.Items.Add("Stop Dev Server")
$menuDevStop.Add_Click({ Start-DashboardServer; Invoke-API "dev/stop" })

$contextMenu.Items.Add("-")  # Separator

# Beta
$menuBetaRestart = $contextMenu.Items.Add("Restart Beta")
$menuBetaRestart.Add_Click({ Start-DashboardServer; Invoke-API "beta/restart" })

$menuDeploy = $contextMenu.Items.Add("Deploy to Beta")
$menuDeploy.Add_Click({ Start-DashboardServer; Invoke-API "beta/deploy" })

$contextMenu.Items.Add("-")  # Separator

# Git
$menuPush = $contextMenu.Items.Add("Push Branch")
$menuPush.Add_Click({ Start-DashboardServer; Invoke-API "git/push" })

$contextMenu.Items.Add("-")  # Separator

# Quit
$menuQuit = $contextMenu.Items.Add("Quit Mission Control")
$menuQuit.Add_Click({
    $notifyIcon.Visible = $false
    $notifyIcon.Dispose()
    [System.Windows.Forms.Application]::Exit()
})

$notifyIcon.ContextMenuStrip = $contextMenu

# Double-click opens dashboard
$notifyIcon.Add_DoubleClick({ Open-Dashboard })

# ── Status polling timer ────────────────────────────────────────

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 10000  # 10 seconds

$timer.Add_Tick({
    try {
        if (-not (Test-ServerRunning $serverPort)) {
            $notifyIcon.Icon = New-StatusIcon "red"
            $notifyIcon.Text = "ChefFlow — Dashboard Offline"
            return
        }

        $status = Invoke-API "status" "GET"
        if (-not $status) {
            $notifyIcon.Icon = New-StatusIcon "yellow"
            return
        }

        $devOk = $status.dev.online
        $betaOk = $status.beta.online
        $ollamaOk = $status.ollamaPc.online -or $status.ollamaPi.online

        $allOk = $devOk -and $betaOk -and $ollamaOk
        $anyDown = (-not $devOk) -or (-not $betaOk) -or (-not $ollamaOk)

        if ($allOk) {
            $notifyIcon.Icon = New-StatusIcon "green"
            $notifyIcon.Text = "ChefFlow — All Systems Online"
        } elseif ($anyDown) {
            $parts = @()
            if (-not $devOk)    { $parts += "Dev" }
            if (-not $betaOk)   { $parts += "Beta" }
            if (-not $ollamaOk) { $parts += "Ollama" }
            $notifyIcon.Icon = New-StatusIcon "yellow"
            $notifyIcon.Text = "ChefFlow — Offline: $($parts -join ', ')"
        }
    } catch {
        $notifyIcon.Icon = New-StatusIcon "red"
    }
})

$timer.Start()

# ── Auto-start dashboard server ─────────────────────────────────

Start-DashboardServer

# ── Run message loop ────────────────────────────────────────────

[System.Windows.Forms.Application]::Run()
