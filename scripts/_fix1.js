const fs = require('fs')
const path = require('path')
const base = 'c:\\Users\\david\\Documents\\CFv1'

function replaceInFile(relPath, oldStr, newStr) {
  const fullPath = path.join(base, relPath)
  let content = fs.readFileSync(fullPath, 'utf8')
  if (!content.includes(oldStr)) {
    console.log('WARN: pattern not found in ' + relPath)
    return false
  }
  content = content.replace(oldStr, newStr)
  fs.writeFileSync(fullPath, content)
  console.log('OK: ' + relPath)
  return true
}

// 1. yoy-cards.tsx
replaceInFile(
  'components/analytics/yoy-cards.tsx',
  "function YoYCard({ metric, isCurrency = false }: { metric: YoYMetric; isCurrency?: boolean }) {\n  const fmt = (v: number) => (isCurrency ? formatCurrency(v) : String(v))\n\n  const trendColor =\n    metric.changeDirection === 'up'\n      ? 'text-emerald-600'\n      : metric.changeDirection === 'down'\n        ? 'text-red-500'\n        : 'text-stone-400'\n\n  const TrendIcon =\n    metric.changeDirection === 'up'\n      ? TrendingUp\n      : metric.changeDirection === 'down'\n        ? TrendingDown\n        : Minus\n\n  return (\n    <Card className=\"p-3\">\n      <p className=\"text-xxs text-stone-500 font-medium uppercase tracking-wide truncate\">\n        {metric.label}\n      </p>\n      <p className=\"text-sm font-bold text-stone-100 mt-1 truncate\">{fmt(metric.currentYear)}</p>\n      <div className={`flex items-center gap-1 mt-1 ${trendColor}`}>\n        <TrendIcon className=\"h-3 w-3 shrink-0\" />\n        <span className=\"text-xxs font-medium\">\n          {metric.changePercent !== null ? `${metric.changePercent}%` : '-'}\n        </span>\n      </div>\n      <p className=\"text-xxs text-stone-400 mt-0.5 truncate\">{fmt(metric.previousYear)} prior yr</p>\n    </Card>\n  )\n}",
  "function YoYCard({ metric, isCurrency = false }: { metric: YoYMetric; isCurrency?: boolean }) {\n  const fmt = (v: number) => (isCurrency ? formatCurrency(v) : String(v))\n\n  // Suppress misleading trend arrow when previous year is 0 (first-year account)\n  const isFirstYear = metric.previousYear === 0\n\n  const trendColor = isFirstYear\n    ? 'text-stone-400'\n    : metric.changeDirection === 'up'\n      ? 'text-emerald-600'\n      : metric.changeDirection === 'down'\n        ? 'text-red-500'\n        : 'text-stone-400'\n\n  const TrendIcon = isFirstYear\n    ? Minus\n    : metric.changeDirection === 'up'\n      ? TrendingUp\n      : metric.changeDirection === 'down'\n        ? TrendingDown\n        : Minus\n\n  return (\n    <Card className=\"p-3\">\n      <p className=\"text-xxs text-stone-500 font-medium uppercase tracking-wide truncate\">\n        {metric.label}\n      </p>\n      <p className=\"text-sm font-bold text-stone-100 mt-1 truncate\">{fmt(metric.currentYear)}</p>\n      <div className={`flex items-center gap-1 mt-1 ${trendColor}`}>\n        <TrendIcon className=\"h-3 w-3 shrink-0\" />\n        <span className=\"text-xxs font-medium\">\n          {isFirstYear ? 'First year' : metric.changePercent !== null ? `${metric.changePercent}%` : '-'}\n        </span>\n      </div>\n      <p className=\"text-xxs text-stone-400 mt-0.5 truncate\">\n        {isFirstYear ? 'No prior year' : `${fmt(metric.previousYear)} prior yr`}\n      </p>\n    </Card>\n  )\n}"
)

console.log('Done with yoy-cards')
