param(
  [switch]$KeepSettingsOpen,
  [string]$LogPath = "$env:TEMP\Ensure-NordVpnLocalLanAccess.log"
)

$ErrorActionPreference = "Stop"

Remove-Item -LiteralPath $LogPath -Force -ErrorAction SilentlyContinue
Set-Content -LiteralPath $LogPath -Value "[Ensure-NordVpnLocalLanAccess] Script starting."

Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Content -LiteralPath $LogPath -Value "[Ensure-NordVpnLocalLanAccess] UIAutomation assemblies loaded."

Add-Type @"
using System;
using System.Runtime.InteropServices;

public static class CodexNordUi
{
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int nWidth, int nHeight, bool bRepaint);

    [DllImport("user32.dll")]
    public static extern bool SetCursorPos(int X, int Y);

    [DllImport("user32.dll")]
    public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, UIntPtr dwExtraInfo);

    public const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
    public const uint MOUSEEVENTF_LEFTUP = 0x0004;
}
"@
Add-Content -LiteralPath $LogPath -Value "[Ensure-NordVpnLocalLanAccess] Native UI helper type loaded."

function Write-Log {
  param(
    [string]$Message
  )

  $line = "[Ensure-NordVpnLocalLanAccess] $Message"
  Add-Content -LiteralPath $LogPath -Value $line
  Write-Output $line
}

function Click-Point {
  param(
    [int]$X,
    [int]$Y
  )

  [CodexNordUi]::SetCursorPos($X, $Y) | Out-Null
  Start-Sleep -Milliseconds 120
  [CodexNordUi]::mouse_event([CodexNordUi]::MOUSEEVENTF_LEFTDOWN, 0, 0, 0, [UIntPtr]::Zero)
  Start-Sleep -Milliseconds 60
  [CodexNordUi]::mouse_event([CodexNordUi]::MOUSEEVENTF_LEFTUP, 0, 0, 0, [UIntPtr]::Zero)
}

function Get-DesktopRoot {
  [System.Windows.Automation.AutomationElement]::RootElement
}

function Wait-Element {
  param(
    [scriptblock]$Finder,
    [int]$TimeoutSeconds = 10,
    [int]$PollMilliseconds = 250
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    $element = & $Finder
    if ($null -ne $element) {
      return $element
    }
    Start-Sleep -Milliseconds $PollMilliseconds
  }

  return $null
}

function Get-FiniteRect {
  param(
    [System.Windows.Automation.AutomationElement]$Element
  )

  $rect = $Element.Current.BoundingRectangle
  if ([double]::IsInfinity($rect.Left) -or [double]::IsInfinity($rect.Top) -or [double]::IsInfinity($rect.Right) -or [double]::IsInfinity($rect.Bottom)) {
    return $null
  }

  return $rect
}

function Get-AncestorByControlType {
  param(
    [System.Windows.Automation.AutomationElement]$Element,
    [System.Windows.Automation.ControlType]$ControlType
  )

  $walker = [System.Windows.Automation.TreeWalker]::RawViewWalker
  $current = $Element
  while ($null -ne $current) {
    if ($current.Current.ControlType -eq $ControlType) {
      return $current
    }
    $current = $walker.GetParent($current)
  }

  return $null
}

function Get-ShellElement {
  param(
    [int]$TimeoutSeconds = 5
  )

  Wait-Element -TimeoutSeconds $TimeoutSeconds -Finder {
    $desktop = Get-DesktopRoot
    $condition = New-Object System.Windows.Automation.PropertyCondition(
      [System.Windows.Automation.AutomationElement]::AutomationIdProperty,
      "Shell"
    )
    $desktop.FindFirst([System.Windows.Automation.TreeScope]::Children, $condition)
  }
}

function Get-NordVpnDescendantByAutomationId {
  param(
    [string]$AutomationId,
    [int]$TimeoutSeconds = 5
  )

  Wait-Element -TimeoutSeconds $TimeoutSeconds -Finder {
    $shell = Get-ShellElement -TimeoutSeconds 1
    if ($null -eq $shell) {
      return $null
    }
    $condition = New-Object System.Windows.Automation.PropertyCondition(
      [System.Windows.Automation.AutomationElement]::AutomationIdProperty,
      $AutomationId
    )
    $shell.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $condition)
  }
}

function Get-NordVpnVisibleByNameAndType {
  param(
    [string]$Name,
    [System.Windows.Automation.ControlType]$ControlType,
    [int]$TimeoutSeconds = 5
  )

  Wait-Element -TimeoutSeconds $TimeoutSeconds -Finder {
    $shell = Get-ShellElement -TimeoutSeconds 1
    if ($null -eq $shell) {
      return $null
    }
    $condition = New-Object System.Windows.Automation.AndCondition(
      (New-Object System.Windows.Automation.PropertyCondition(
        [System.Windows.Automation.AutomationElement]::NameProperty,
        $Name
      )),
      (New-Object System.Windows.Automation.PropertyCondition(
        [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
        $ControlType
      ))
    )
    $matches = $shell.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condition)
    for ($i = 0; $i -lt $matches.Count; $i++) {
      $candidate = $matches.Item($i)
      $rect = Get-FiniteRect -Element $candidate
      if ($null -ne $rect -and -not $candidate.Current.IsOffscreen) {
        return $candidate
      }
    }
    $null
  }
}

function Ensure-NordVpnShell {
  Write-Log "Ensuring NordVPN shell window is available."
  $process = Get-Process NordVPN -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($null -eq $process) {
    Write-Log "Starting NordVPN app."
    Start-Process "C:\Program Files\NordVPN\NordVPN.exe"
  }

  $shell = Get-ShellElement -TimeoutSeconds 15
  if ($null -eq $shell) {
    throw "NordVPN shell window was not found."
  }

  $handle = [IntPtr]$shell.Current.NativeWindowHandle
  if ($handle -eq [IntPtr]::Zero) {
    throw "NordVPN shell window handle was not available."
  }

  [CodexNordUi]::ShowWindow($handle, 9) | Out-Null
  [CodexNordUi]::MoveWindow($handle, 100, 100, 900, 700, $true) | Out-Null
  [CodexNordUi]::SetForegroundWindow($handle) | Out-Null
  Start-Sleep -Milliseconds 500

  Write-Log "NordVPN shell window is ready."
  return $shell
}

function Open-NordVpnSettings {
  Add-Content -LiteralPath $LogPath -Value "[Ensure-NordVpnLocalLanAccess] Entering Open-NordVpnSettings."
  $settingsText = Get-NordVpnDescendantByAutomationId -AutomationId "GeneralSettings" -TimeoutSeconds 1
  if ($null -ne $settingsText) {
    Write-Log "NordVPN settings are already open."
    return
  }

  Write-Log "Opening NordVPN settings."
  $shell = Ensure-NordVpnShell
  $shellRect = Get-FiniteRect -Element $shell
  if ($null -eq $shellRect) {
    throw "NordVPN shell bounds were not available."
  }

  $buttons = $shell.FindAll(
    [System.Windows.Automation.TreeScope]::Descendants,
    (New-Object System.Windows.Automation.PropertyCondition(
      [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
      [System.Windows.Automation.ControlType]::Button
    ))
  )

  $accountButton = $null
  $topButtons = @()
  for ($i = 0; $i -lt $buttons.Count; $i++) {
    $button = $buttons.Item($i)
    $rect = Get-FiniteRect -Element $button
    if ($null -eq $rect) {
      continue
    }

    $isTopBar = $rect.Top -lt ($shellRect.Top + 90) -and $rect.Width -ge 30 -and $rect.Width -le 60
    $isUnnamed = [string]::IsNullOrWhiteSpace($button.Current.Name) -and [string]::IsNullOrWhiteSpace($button.Current.AutomationId)
    if ($isTopBar -and $isUnnamed) {
      $topButtons += $button
    }
  }

  if ($topButtons.Count -eq 0) {
    throw "NordVPN account button was not found."
  }

  $accountButton = $topButtons | Sort-Object { (Get-FiniteRect -Element $_).Left } | Select-Object -Last 1
  $accountRect = Get-FiniteRect -Element $accountButton
  Click-Point -X ([int](($accountRect.Left + $accountRect.Right) / 2)) -Y ([int](($accountRect.Top + $accountRect.Bottom) / 2))
  Write-Log "Opened NordVPN account menu."

  $settingsMenuItem = Get-NordVpnVisibleByNameAndType -Name "Settings" -ControlType ([System.Windows.Automation.ControlType]::ListItem) -TimeoutSeconds 5
  if ($null -eq $settingsMenuItem) {
    throw "NordVPN settings menu item was not found."
  }

  $settingsRect = Get-FiniteRect -Element $settingsMenuItem
  Click-Point -X ([int](($settingsRect.Left + $settingsRect.Right) / 2)) -Y ([int](($settingsRect.Top + $settingsRect.Bottom) / 2))

  $settingsText = Get-NordVpnDescendantByAutomationId -AutomationId "GeneralSettings" -TimeoutSeconds 10
  if ($null -eq $settingsText) {
    throw "NordVPN settings view did not open."
  }

  Write-Log "NordVPN settings view is open."
}

function Select-ConnectionSettings {
  Add-Content -LiteralPath $LogPath -Value "[Ensure-NordVpnLocalLanAccess] Entering Select-ConnectionSettings."
  Write-Log "Selecting Connection and security settings."
  $child = Get-NordVpnDescendantByAutomationId -AutomationId "ConnectionSettings" -TimeoutSeconds 10
  if ($null -eq $child) {
    throw "The Connection and security settings text was not found."
  }

  $target = Get-AncestorByControlType -Element $child -ControlType ([System.Windows.Automation.ControlType]::ListItem)
  if ($null -eq $target) {
    throw "The Connection and security settings navigation item was not found."
  }

  $target.SetFocus()
  $selectionPattern = $target.GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern)
  $selectionPattern.Select()
  Write-Log "Connection and security settings selected."
}

function Get-ToggleState {
  param(
    [string]$AutomationId
  )

  $toggleElement = Get-NordVpnDescendantByAutomationId -AutomationId $AutomationId -TimeoutSeconds 10
  if ($null -eq $toggleElement) {
    throw "Toggle '$AutomationId' was not found."
  }

  $togglePattern = $toggleElement.GetCurrentPattern([System.Windows.Automation.TogglePattern]::Pattern)
  [PSCustomObject]@{
    Element = $toggleElement
    Pattern = $togglePattern
    State = $togglePattern.Current.ToggleState
  }
}

function Ensure-ToggleState {
  param(
    [string]$AutomationId,
    [System.Windows.Automation.ToggleState]$DesiredState
  )

  $info = Get-ToggleState -AutomationId $AutomationId
  if ($info.State -ne $DesiredState) {
    $info.Pattern.Toggle()
    Start-Sleep -Seconds 1
    $info = Get-ToggleState -AutomationId $AutomationId
  }

  if ($info.State -ne $DesiredState) {
    throw "Toggle '$AutomationId' did not reach state '$DesiredState'."
  }

  return $info.State
}

function Close-SettingsWindow {
  Add-Content -LiteralPath $LogPath -Value "[Ensure-NordVpnLocalLanAccess] Entering Close-SettingsWindow."
  Write-Log "Closing NordVPN settings window."
  $window = Get-NordVpnVisibleByNameAndType -Name "Settings" -ControlType ([System.Windows.Automation.ControlType]::Window) -TimeoutSeconds 2
  if ($null -eq $window) {
    return
  }

  try {
    $pattern = $window.GetCurrentPattern([System.Windows.Automation.WindowPattern]::Pattern)
    $pattern.Close()
  } catch {
  }
}

Add-Content -LiteralPath $LogPath -Value "[Ensure-NordVpnLocalLanAccess] Calling Open-NordVpnSettings."
Open-NordVpnSettings
Add-Content -LiteralPath $LogPath -Value "[Ensure-NordVpnLocalLanAccess] Calling Select-ConnectionSettings."
Select-ConnectionSettings

Write-Log "Ensuring NordVPN LAN-related toggles are set."
$stayInvisibleState = Ensure-ToggleState -AutomationId "SettingsViewStayInvisibleOnLanToggle" -DesiredState ([System.Windows.Automation.ToggleState]::Off)
$allowRemoteState = Ensure-ToggleState -AutomationId "SettingsViewAllowRemoteAccessToggle" -DesiredState ([System.Windows.Automation.ToggleState]::On)

if (-not $KeepSettingsOpen) {
  Close-SettingsWindow
}

[PSCustomObject]@{
  StayInvisibleOnLan = $stayInvisibleState.ToString()
  AllowRemoteAccess = $allowRemoteState.ToString()
}
