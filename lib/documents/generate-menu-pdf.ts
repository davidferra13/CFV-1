'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { PDFLayout } from './pdf-layout'
import { allergenShortName } from '@/lib/constants/allergens'
import { format } from 'date-fns'

// --- Types ---

type MenuPdfOptions = {
  showDescriptions?: boolean
  showDietary?: boolean
  showCourseHeaders?: boolean
}

type ComponentRow = {
  id: string
  name: string
  sort_order: number
  recipe_id: string | null
  recipe: {
    name: string
    description: string | null
    dietary_tags: string[]
  } | null
}

type DishRow = {
  id: string
  name: string | null
  course_name: string
  course_number: number
  sort_order: number
  description: string | null
  dietary_tags: string[]
  allergen_flags: string[]
  components: ComponentRow[]
}

// --- Dietary Tag Short Labels ---

const DIETARY_SHORT: Record<string, string> = {
  vegan: 'VG',
  vegetarian: 'V',
  'gluten-free': 'GF',
  'dairy-free': 'DF',
  'nut-free': 'NF',
  pescatarian: 'PSC',
  keto: 'K',
  paleo: 'P',
  halal: 'HAL',
  kosher: 'KOS',
}

function dietaryShort(tag: string): string {
  return DIETARY_SHORT[tag.toLowerCase()] ?? tag
}

// --- Main Export ---

export async function generateMenuPdf(menuId: string, options?: MenuPdfOptions): Promise<string> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = await createServerClient()

  const showDescriptions = options?.showDescriptions ?? true
  const showDietary = options?.showDietary ?? true
  const showCourseHeaders = options?.showCourseHeaders ?? true

  // Fetch menu
  const { data: menu, error: menuErr } = await supabase
    .from('menus')
    .select('id, name, description, cuisine_type, service_style')
    .eq('id', menuId)
    .eq('tenant_id', tenantId)
    .single()

  if (menuErr || !menu) {
    throw new Error('Menu not found')
  }

  // Fetch chef business info
  const { data: chef } = await supabase
    .from('chefs')
    .select('business_name')
    .eq('id', tenantId)
    .single()

  const businessName = chef?.business_name || 'Chef'
  const businessTagline: string | null = null

  // Fetch dishes with components and linked recipes
  const { data: dishes, error: dishErr } = await supabase
    .from('dishes')
    .select(
      `
      id,
      name,
      course_name,
      course_number,
      sort_order,
      description,
      dietary_tags,
      allergen_flags,
      components (
        id,
        name,
        sort_order,
        recipe_id,
        recipe:recipes (
          name,
          description,
          dietary_tags
        )
      )
    `
    )
    .eq('menu_id', menuId)
    .eq('tenant_id', tenantId)
    .order('course_number', { ascending: true })
    .order('sort_order', { ascending: true })

  if (dishErr) {
    throw new Error('Failed to load menu dishes')
  }

  const typedDishes = (dishes || []) as unknown as DishRow[]

  // Group dishes by course
  const courseMap = new Map<number, { courseName: string; dishes: DishRow[] }>()
  for (const dish of typedDishes) {
    const existing = courseMap.get(dish.course_number)
    if (existing) {
      existing.dishes.push(dish)
    } else {
      courseMap.set(dish.course_number, {
        courseName: dish.course_name,
        dishes: [dish],
      })
    }
  }

  // Sort dishes within each course by sort_order
  for (const group of courseMap.values()) {
    group.dishes.sort((a, b) => a.sort_order - b.sort_order)
  }

  // Collect all allergens across the menu
  const allAllergens = new Set<string>()
  for (const dish of typedDishes) {
    for (const flag of dish.allergen_flags || []) {
      allAllergens.add(flag)
    }
  }

  // Collect all dietary tags across the menu
  const allDietaryTags = new Set<string>()
  for (const dish of typedDishes) {
    for (const tag of dish.dietary_tags || []) {
      allDietaryTags.add(tag)
    }
    for (const comp of dish.components || []) {
      if (comp.recipe?.dietary_tags) {
        for (const tag of comp.recipe.dietary_tags) {
          allDietaryTags.add(tag)
        }
      }
    }
  }

  // --- Build PDF ---

  const pdf = new PDFLayout()

  // Header: business name (large, bold)
  pdf.title(businessName, 16)

  // Tagline underneath (if exists)
  if (businessTagline) {
    pdf.text(businessTagline, 9, 'italic')
    pdf.space(2)
  }

  // Menu title centered
  pdf.title(menu.name, 13)

  // Menu description if present
  if (menu.description) {
    pdf.text(menu.description, 9, 'italic')
    pdf.space(2)
  }

  // Thin separator
  pdf.hr()
  pdf.space(1)

  // Courses
  const sortedCourses = Array.from(courseMap.entries()).sort(([a], [b]) => a - b)

  for (const [courseNum, group] of sortedCourses) {
    // Course header
    if (showCourseHeaders) {
      const courseLabel =
        group.courseName !== `Course ${courseNum}` ? `${group.courseName}` : `Course ${courseNum}`
      pdf.sectionHeader(courseLabel, 11, true)
      pdf.space(1)
    }

    for (const dish of group.dishes) {
      // Dish name (bold)
      const dishName = dish.name || group.courseName
      const dishDietaryLine =
        showDietary && dish.dietary_tags?.length
          ? `  [${dish.dietary_tags.map(dietaryShort).join(', ')}]`
          : ''

      pdf.text(dishName + dishDietaryLine, 10, 'bold', 2)

      // Dish description
      if (showDescriptions && dish.description) {
        pdf.text(dish.description, 8, 'italic', 4)
      }

      // Components
      const sortedComponents = (dish.components || []).sort((a, b) => a.sort_order - b.sort_order)

      if (sortedComponents.length > 0) {
        for (const comp of sortedComponents) {
          const compName = comp.recipe?.name || comp.name

          // Component dietary tags from linked recipe
          let compDietary = ''
          if (showDietary && comp.recipe?.dietary_tags?.length) {
            compDietary = `  [${comp.recipe.dietary_tags.map(dietaryShort).join(', ')}]`
          }

          pdf.bullet(compName + compDietary, 8, 6)

          // Recipe description under component
          if (showDescriptions && comp.recipe?.description) {
            pdf.text(comp.recipe.description, 7, 'italic', 10)
          }
        }
      }

      pdf.space(2)
    }

    pdf.space(1)
  }

  // Allergen summary at bottom (if any)
  if (showDietary && allAllergens.size > 0) {
    pdf.hr()
    pdf.space(1)
    const allergenList = Array.from(allAllergens).map(allergenShortName).sort().join(', ')
    pdf.text(`Allergens present: ${allergenList}`, 8, 'bold')
    pdf.space(1)
  }

  // Dietary legend
  if (showDietary && allDietaryTags.size > 0) {
    const legendParts = Array.from(allDietaryTags)
      .sort()
      .map((tag) => `${dietaryShort(tag)} = ${tag}`)
      .join('   ')
    pdf.text(legendParts, 7, 'italic')
    pdf.space(1)
  }

  // Footer
  const dateStr = format(new Date(), 'MMMM d, yyyy')
  pdf.generatedBy(businessName, 'Menu')
  pdf.footer(`Prepared by ${businessName}  |  ${dateStr}`)

  // Return base64
  const buffer = pdf.toBuffer()
  return buffer.toString('base64')
}
