#!/bin/bash
# .claude/hooks/notify.sh
#
# DESKTOP NOTIFICATION HOOK
# Sends a Windows toast notification when Claude needs user input.
# Triggered by the Notification hook event.

powershell.exe -NoProfile -Command "
  [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
  [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom, ContentType = WindowsRuntime] | Out-Null

  \$template = @'
<toast>
  <visual>
    <binding template='ToastGeneric'>
      <text>Claude Code</text>
      <text>Claude needs your input</text>
    </binding>
  </visual>
  <audio silent='true'/>
</toast>
'@

  \$xml = New-Object Windows.Data.Xml.Dom.XmlDocument
  \$xml.LoadXml(\$template)
  \$toast = [Windows.UI.Notifications.ToastNotification]::new(\$xml)
  [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('Claude Code').Show(\$toast)
" 2>/dev/null

exit 0
