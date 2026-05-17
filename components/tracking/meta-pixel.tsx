'use client'

import { useEffect } from 'react'
import Script from 'next/script'

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID

/**
 * Standard Meta Pixel conversion events for ChefFlow public pages.
 */
export type MetaEventName = 'PageView' | 'Lead' | 'Contact' | 'ViewContent' | 'Schedule'

/**
 * Fire a Meta Pixel event (client-side).
 * No-ops gracefully if pixel is not configured.
 */
export function trackEvent(eventName: MetaEventName | string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  if (!(window as any).fbq) return
  ;(window as any).fbq('track', eventName, params)
}

/**
 * Meta Pixel component. Renders nothing if NEXT_PUBLIC_META_PIXEL_ID is unset.
 * Place in layout; fires PageView on mount.
 */
export function MetaPixel() {
  useEffect(() => {
    if (!PIXEL_ID) return
    // Fire PageView once on mount (subsequent navigations handled by Next router)
    if ((window as any).fbq) {
      ;(window as any).fbq('track', 'PageView')
    }
  }, [])

  if (!PIXEL_ID) return null

  return (
    <>
      <Script
        id="meta-pixel-base"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${PIXEL_ID}');
`,
        }}
      />
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  )
}
