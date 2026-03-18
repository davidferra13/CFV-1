// Desktop notification bridge
// Sends a native OS notification when running inside the Tauri desktop app.
// Falls back silently (no-op) when running in a browser.
// Never call this from server-side code - browser-only.

type DesktopNotification = {
  title: string
  body: string
}

/**
 * Send a native desktop notification if running inside the Tauri shell.
 * Safe to call anywhere on the client - silently does nothing in browsers.
 */
export async function sendDesktopNotification(notification: DesktopNotification): Promise<void> {
  const inTauri =
    typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)

  if (!inTauri) return

  try {
    const { isPermissionGranted, requestPermission, sendNotification } =
      await import('@tauri-apps/plugin-notification')

    let permissionGranted = await isPermissionGranted()
    if (!permissionGranted) {
      const permission = await requestPermission()
      permissionGranted = permission === 'granted'
    }

    if (permissionGranted) {
      sendNotification({ title: notification.title, body: notification.body })
    }
  } catch (err) {
    // Non-blocking - desktop notifications must never crash the app
    console.warn('[desktop-notify] failed to send notification', err)
  }
}
