'use client'

export function BriefingMenuSummary({
  menus,
}: {
  menus: {
    name: string
    dishes: { courseName: string; description: string | null }[]
  }[]
}) {
  if (menus.length === 0) {
    return (
      <p className="text-sm text-stone-500 italic">No menu assigned yet.</p>
    )
  }

  return (
    <div className="space-y-4">
      {menus.map((menu, i) => (
        <div key={i} className="space-y-2">
          {menus.length > 1 && (
            <h4 className="text-sm font-semibold text-stone-400">{menu.name}</h4>
          )}

          {menu.dishes.length === 0 ? (
            <p className="text-sm text-stone-500 italic">No dishes added.</p>
          ) : (
            <div className="space-y-1">
              {menu.dishes.map((dish, j) => (
                <div key={j} className="flex items-baseline gap-2 py-1">
                  <span className="text-xs text-stone-500 uppercase font-medium shrink-0 w-20 text-right">
                    {dish.courseName}
                  </span>
                  <span className="text-sm text-stone-200">
                    {dish.description || dish.courseName}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
