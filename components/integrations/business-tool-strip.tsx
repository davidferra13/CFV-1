import Link from 'next/link'
import { CheckCircle, Circle } from '@/components/ui/icons'

type BusinessTool = {
  name: string
  description: string
  href: string
  connected: boolean
}

type BusinessToolStripProps = {
  tools: BusinessTool[]
}

export function BusinessToolStrip({ tools }: BusinessToolStripProps) {
  if (tools.length === 0) return null

  return (
    <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-4">
      <h3 className="text-sm font-semibold text-stone-300 mb-3">Business tools</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {tools.map((tool) => (
          <Link
            key={tool.name}
            href={tool.href}
            className="flex items-center gap-3 rounded-lg border border-stone-800 hover:border-stone-600 bg-stone-900 hover:bg-stone-800/60 p-3 transition-all"
          >
            {tool.connected ? (
              <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <Circle className="h-4 w-4 text-stone-600 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-stone-200 truncate">{tool.name}</p>
              <p className="text-xs text-stone-500 truncate">
                {tool.connected ? 'Connected' : tool.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
