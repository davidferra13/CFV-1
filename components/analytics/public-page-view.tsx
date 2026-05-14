type PublicPageViewProps = {
  pageName: string
  properties?: Record<string, string | number | boolean | null>
}

export function PublicPageView({ pageName, properties }: PublicPageViewProps) {
  const payload = JSON.stringify({
    event: 'page_viewed',
    properties: {
      page: pageName,
      ...properties,
    },
  }).replace(/</g, '\\u003c')

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          try {
            var payload = ${payload};
            if (window.posthog && typeof window.posthog.capture === 'function') {
              window.posthog.capture(payload.event, payload.properties);
            }
          } catch (_) {}
        `,
      }}
    />
  )
}
