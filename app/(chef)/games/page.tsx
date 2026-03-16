import Link from 'next/link'

const games: {
  href: string
  emoji: string
  title: string
  description: string
  color: string
  cta?: string
}[] = [
  {
    href: '/games/menu-muse',
    emoji: '\u{1F4A1}',
    title: 'Menu Muse',
    description:
      "Break through writer's block. Your recipes, your heroes, your season, your spark - all in one place to fuel your next menu.",
    color: 'from-brand-500/20 to-amber-500/20',
    cta: 'Get inspired',
  },
  {
    href: '/games/the-line',
    emoji: '🔥',
    title: 'The Line',
    description:
      "Survive the dinner rush. Fire orders, manage your stations, and don't burn the proteins. Remy's calling expo.",
    color: 'from-amber-500/20 to-orange-500/20',
  },
  {
    href: '/games/snake',
    emoji: '🐍',
    title: 'Chef Snake',
    description:
      'Slither around collecting ingredients to complete recipes. The more you eat, the longer you get - and the faster it goes.',
    color: 'from-orange-500/20 to-red-500/20',
  },
  {
    href: '/games/galaga',
    emoji: '🍳',
    title: 'Food Galaga',
    description:
      'Defend your kitchen! Waves of rogue ingredients are attacking. Grab power-ups and blast them before they reach the pass.',
    color: 'from-blue-500/20 to-purple-500/20',
  },
  {
    href: '/games/trivia',
    emoji: '🧠',
    title: "Remy's Kitchen Trivia",
    description:
      'Pick any culinary topic and let Remy quiz you with unique questions every time. Learn something new with every round.',
    color: 'from-green-500/20 to-teal-500/20',
  },
  {
    href: '/games/tic-tac-toe',
    emoji: '❌',
    title: 'Tic-Tac-Toe vs Remy',
    description:
      'Challenge Remy to a food-themed battle of wits. Pick 3x3, 4x4, or 5x5 grids. Can you outsmart the kitchen AI?',
    color: 'from-pink-500/20 to-rose-500/20',
  },
]

export default function GamesPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">Chef Arcade</h1>
        <p className="mt-2 text-muted-foreground">
          Take a break, have some fun, sharpen your skills.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {games.map((game) => (
          <Link
            key={game.href}
            href={game.href}
            className="group relative overflow-hidden rounded-xl border bg-card p-6 transition-all hover:shadow-lg hover:border-brand-500/50"
          >
            <div
              className={`absolute inset-0 bg-gradient-to-br ${game.color} opacity-0 transition-opacity group-hover:opacity-100`}
            />
            <div className="relative">
              <div className="mb-4 text-5xl">{game.emoji}</div>
              <h2 className="mb-2 text-xl font-semibold">{game.title}</h2>
              <p className="text-sm text-muted-foreground">{game.description}</p>
              <div className="mt-4 inline-flex items-center text-sm font-medium text-brand-500">
                {game.cta || 'Play now'}
                <span className="ml-1 transition-transform group-hover:translate-x-1">&rarr;</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
