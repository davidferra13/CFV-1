import type { MenuQuadrant } from '@/lib/menus/menu-engineering-actions'

const STYLES: Record<MenuQuadrant, { bg: string; text: string; label: string; title: string }> = {
  star: {
    bg: 'bg-amber-900/40',
    text: 'text-amber-300',
    label: 'Star',
    title: 'Star: high popularity, high margin. Protect and feature.',
  },
  plowhorse: {
    bg: 'bg-blue-900/40',
    text: 'text-blue-300',
    label: 'PH',
    title: 'Plowhorse: high popularity, low margin. Reduce costs or raise price.',
  },
  puzzle: {
    bg: 'bg-purple-900/40',
    text: 'text-purple-300',
    label: 'PZ',
    title: 'Puzzle: low popularity, high margin. Reposition or promote.',
  },
  dog: {
    bg: 'bg-red-900/40',
    text: 'text-red-300',
    label: 'Dog',
    title: 'Dog: low popularity, low margin. Consider removing or reworking.',
  },
}

export function QuadrantBadge({ quadrant }: { quadrant: MenuQuadrant }) {
  const s = STYLES[quadrant]
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${s.bg} ${s.text}`}
      title={s.title}
    >
      {s.label}
    </span>
  )
}
