# ═══════════════════════════════════════════════════════════════════
#  Window Placement Utility - Move spawned windows to secondary monitor
# ═══════════════════════════════════════════════════════════════════
# Dot-source this file in any PowerShell script that spawns windows:
#   . "$PSScriptRoot\lib\window-placement.ps1"
#
# Then call:
#   Move-ToSecondaryMonitor -ProcessId $proc.Id
#
# Config: .chefflow-windows.json in project root (optional)
#   { "targetMonitor": 1 }    (0 = primary, 1 = first secondary, etc.)
# ═══════════════════════════════════════════════════════════════════

Add-Type -AssemblyName System.Windows.Forms

# Load Win32 APIs for window manipulation
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public static class WindowPlacement {
    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int nWidth, int nHeight, bool bRepaint);

    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }
}
"@ -ErrorAction SilentlyContinue

function Get-WindowPlacementConfig {
    <#
    .SYNOPSIS
    Reads the target monitor index from .chefflow-windows.json
    Returns 1 (first secondary monitor) by default.
    #>
    $configLocations = @(
        (Join-Path $PSScriptRoot "..\..\..\.chefflow-windows.json"),
        (Join-Path $PSScriptRoot "..\..\.chefflow-windows.json"),
        (Join-Path $env:USERPROFILE ".chefflow-windows.json")
    )

    foreach ($path in $configLocations) {
        $resolved = $null
        try { $resolved = (Resolve-Path $path -ErrorAction SilentlyContinue).Path } catch {}
        if ($resolved -and (Test-Path $resolved)) {
            try {
                $config = Get-Content $resolved -Raw | ConvertFrom-Json
                if ($null -ne $config.targetMonitor) {
                    return [int]$config.targetMonitor
                }
            } catch {
                # Bad JSON, fall through to default
            }
        }
    }

    return 1  # Default: first secondary monitor
}

function Get-SecondaryMonitorBounds {
    <#
    .SYNOPSIS
    Returns the working area bounds of the target secondary monitor.
    Falls back to primary if no secondary exists.
    #>
    param(
        [int]$TargetIndex = -1
    )

    if ($TargetIndex -lt 0) {
        $TargetIndex = Get-WindowPlacementConfig
    }

    $screens = [System.Windows.Forms.Screen]::AllScreens

    if ($screens.Count -le 1) {
        # Only one monitor, return primary
        return [System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea
    }

    # Build ordered list: non-primary screens sorted by X position
    $secondary = $screens | Where-Object { -not $_.Primary } | Sort-Object { $_.Bounds.X }

    if ($TargetIndex -ge $secondary.Count) {
        # Target index beyond available secondaries, use the last one
        $TargetIndex = $secondary.Count - 1
    }

    return $secondary[$TargetIndex].WorkingArea
}

function Get-SecondaryMonitorPosition {
    <#
    .SYNOPSIS
    Returns a hashtable with X, Y coordinates for placing a window on the secondary monitor.
    Useful for Chrome --window-position flag.
    #>
    param(
        [int]$OffsetX = 50,
        [int]$OffsetY = 50
    )

    $bounds = Get-SecondaryMonitorBounds
    return @{
        X = $bounds.X + $OffsetX
        Y = $bounds.Y + $OffsetY
        Width = $bounds.Width
        Height = $bounds.Height
    }
}

function Move-ToSecondaryMonitor {
    <#
    .SYNOPSIS
    Moves a window (by process ID) to the secondary monitor.
    Waits for the window handle to become available.

    .PARAMETER ProcessId
    The process ID of the window to move.

    .PARAMETER TimeoutSeconds
    How long to wait for the window handle (default 15s).

    .PARAMETER PreserveSize
    If true, keeps the current window size. Otherwise fits to monitor.
    #>
    param(
        [Parameter(Mandatory)]
        [int]$ProcessId,

        [int]$TimeoutSeconds = 15,

        [switch]$PreserveSize
    )

    $bounds = Get-SecondaryMonitorBounds

    $deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
    $hwnd = [IntPtr]::Zero

    while ([DateTime]::UtcNow -lt $deadline) {
        $proc = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
        if ($proc -and $proc.MainWindowHandle -ne [IntPtr]::Zero) {
            $hwnd = $proc.MainWindowHandle
            break
        }
        Start-Sleep -Milliseconds 300
    }

    if ($hwnd -eq [IntPtr]::Zero) {
        Write-Warning "[window-placement] Could not find window handle for PID $ProcessId within ${TimeoutSeconds}s"
        return $false
    }

    # Get current window size
    $rect = New-Object WindowPlacement+RECT
    [WindowPlacement]::GetWindowRect($hwnd, [ref]$rect) | Out-Null
    $currentWidth = $rect.Right - $rect.Left
    $currentHeight = $rect.Bottom - $rect.Top

    if ($PreserveSize) {
        $newX = $bounds.X + 50
        $newY = $bounds.Y + 50
        [WindowPlacement]::MoveWindow($hwnd, $newX, $newY, $currentWidth, $currentHeight, $true) | Out-Null
    } else {
        # Place at secondary monitor with some margin
        $margin = 30
        $newX = $bounds.X + $margin
        $newY = $bounds.Y + $margin
        $newWidth = [Math]::Min($currentWidth, $bounds.Width - (2 * $margin))
        $newHeight = [Math]::Min($currentHeight, $bounds.Height - (2 * $margin))
        [WindowPlacement]::MoveWindow($hwnd, $newX, $newY, $newWidth, $newHeight, $true) | Out-Null
    }

    return $true
}

function Start-ProcessOnSecondaryMonitor {
    <#
    .SYNOPSIS
    Wrapper around Start-Process that spawns the process then moves it to the secondary monitor.
    Returns the process object.
    #>
    param(
        [Parameter(Mandatory)]
        [string]$FilePath,

        [string[]]$ArgumentList,

        [string]$WorkingDirectory,

        [switch]$PassThru,

        [switch]$PreserveSize
    )

    $startParams = @{
        FilePath = $FilePath
        PassThru = $true
    }
    if ($ArgumentList)     { $startParams.ArgumentList = $ArgumentList }
    if ($WorkingDirectory) { $startParams.WorkingDirectory = $WorkingDirectory }

    $proc = Start-Process @startParams

    # Give the window a moment to appear
    Start-Sleep -Milliseconds 800

    $moved = Move-ToSecondaryMonitor -ProcessId $proc.Id -PreserveSize:$PreserveSize

    if ($moved) {
        Write-Host "  -> Moved PID $($proc.Id) to secondary monitor"
    }

    return $proc
}
