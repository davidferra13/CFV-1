import { notFound } from 'next/navigation'

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  // Hard gate - only renders when DEMO_MODE_ENABLED=true
  if (process.env.DEMO_MODE_ENABLED !== 'true') {
    notFound()
  }

  return (
    <html lang="en">
      <body
        style={{ margin: 0, fontFamily: 'Inter, system-ui, sans-serif', background: '#fafaf9' }}
      >
        {children}
      </body>
    </html>
  )
}
