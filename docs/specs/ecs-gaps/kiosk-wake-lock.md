# ECS Gap: Kiosk Wake Lock and Attract Mode

> Source: ECS Scorecard 2026-04-27 | User Type: Kiosk (78/100) | Dimension: Polish (15/20)

## Problem
No Wake Lock API usage to prevent tablet screen from dimming. No attract/screensaver mode when idle.

## Spec
1. Add Wake Lock API to kiosk layout:
   ```tsx
   useEffect(() => {
     let wakeLock: WakeLockSentinel | null = null
     const requestWakeLock = async () => {
       try { wakeLock = await navigator.wakeLock.request('screen') }
       catch (e) { console.warn('Wake Lock not supported') }
     }
     requestWakeLock()
     document.addEventListener('visibilitychange', () => {
       if (document.visibilityState === 'visible') requestWakeLock()
     })
     return () => { wakeLock?.release() }
   }, [])
   ```
2. Optional: Add attract mode component that shows branding/logo animation when idle (before PIN reset kicks in)

## Acceptance
- Screen stays on while kiosk is active
- Graceful fallback if Wake Lock API not supported
- No screen dimming during events
