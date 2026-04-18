// AI Meal Prep Rotation Advisor
// Given a client's dietary prefs, recent menu history, and available menus,
// picks the best next menu with a reason. Falls back to LRU if AI unavailable.

import { parseWithOllama } from './parse-ollama'
import { z } from 'zod'

const RotationSchema = z.object({
  menuId: z.string(),
  reason: z.string(),
})

type RotationContext = {
  clientName: string
  dietaryRestrictions: string[]
  allergies: string[]
  recentMenuTitles: string[]
  availableMenus: { id: string; title: string }[]
}

export async function suggestMealPrepRotation(
  ctx: RotationContext
): Promise<{ menuId: string; reason: string } | null> {
  if (ctx.availableMenus.length === 0) return null

  try {
    const now = new Date()
    const season = getSeason(now.getMonth())

    const menuList = ctx.availableMenus.map((m) => `- ${m.id}: "${m.title}"`).join('\n')

    const prompt = [
      `Client: ${ctx.clientName}`,
      `Dietary restrictions: ${ctx.dietaryRestrictions.length > 0 ? ctx.dietaryRestrictions.join(', ') : 'None'}`,
      `Allergies: ${ctx.allergies.length > 0 ? ctx.allergies.join(', ') : 'None'}`,
      `Season: ${season}`,
      `Recently served (avoid repeating): ${ctx.recentMenuTitles.length > 0 ? ctx.recentMenuTitles.join(', ') : 'None'}`,
      '',
      `Available menus:`,
      menuList,
    ].join('\n')

    const result = await parseWithOllama(
      `You are a private chef's meal prep assistant. Pick the best menu for this week's meal prep delivery based on the client's preferences, dietary needs, season, and recent menu history. Avoid repeating recent menus. Choose variety. Return JSON with the exact menu ID from the list: {"menuId": "uuid-here", "reason": "one sentence why"}. Never use em dashes.`,
      prompt,
      RotationSchema,
      { modelTier: 'fast', maxTokens: 100, timeoutMs: 6000 }
    )

    // Validate the AI returned a real menu ID
    const match = ctx.availableMenus.find((m) => m.id === result.menuId)
    if (!match) return null

    return { menuId: result.menuId, reason: result.reason }
  } catch {
    return null
  }
}

function getSeason(month: number): string {
  if (month >= 2 && month <= 4) return 'spring'
  if (month >= 5 && month <= 7) return 'summer'
  if (month >= 8 && month <= 10) return 'fall'
  return 'winter'
}
