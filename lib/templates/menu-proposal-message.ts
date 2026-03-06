// Menu Proposal Message Template
// Deterministic (Formula > AI) template for sharing menu options with clients.
// Used by both circle posting and Remy action preview.

export interface MenuOption {
  name: string
  description?: string | null
  courseCount: number
  courses: Array<{
    name: string
    dishes: string[]
  }>
}

export interface MenuProposalInput {
  menus: MenuOption[]
  chefFirstName: string
  clientName: string
  occasion: string | null
  guestCount: number | null
  dietaryNote: string | null
}

export function generateMenuProposalMessage(input: MenuProposalInput): { body: string } {
  const parts: string[] = []

  // Opening
  const count = input.menus.length
  const countWord = count === 1 ? 'a menu direction' : `${count} menu directions`
  const occasionPart = input.occasion ? ` for your ${input.occasion.toLowerCase()}` : ''
  parts.push(`Hi ${input.clientName.split(' ')[0]}! I've put together ${countWord}${occasionPart}.`)

  // Each menu option
  for (const menu of input.menus) {
    parts.push('')
    const courseLabel = menu.courseCount === 1 ? '1 course' : `${menu.courseCount} courses`
    parts.push(`**${menu.name}** (${courseLabel})`)

    if (menu.description) {
      parts.push(menu.description)
    }

    for (const course of menu.courses) {
      const dishList = course.dishes.join(', ')
      parts.push(`- ${course.name}: ${dishList}`)
    }
  }

  // Dietary note
  if (input.dietaryNote) {
    parts.push('')
    parts.push(`All options account for ${input.dietaryNote}.`)
  }

  // Closing
  parts.push('')
  parts.push(
    "Let me know which direction speaks to you, or if you'd like me to mix and match. Happy to adjust anything."
  )
  parts.push('')
  parts.push(input.chefFirstName)

  return { body: parts.join('\n') }
}
