// FOH Menu Image Generator
// Converts FOHMenuData to a 1200x1600 PNG using Satori + resvg.
// No browser required. All layout uses Satori-compatible JSX (div/span/p, flexbox only).

import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import type { FOHMenuData, FOHCourse } from '@/lib/menus/foh-menu-data'
import { readFile } from 'fs/promises'
import { join } from 'path'

const WIDTH = 1200
const HEIGHT = 1600

// Font loading (cached across invocations)
let fontDataCache: { regular: ArrayBuffer; bold: ArrayBuffer; italic: ArrayBuffer } | null = null

async function loadFonts() {
  if (fontDataCache) return fontDataCache

  // Use Next.js bundled fonts or fall back to system fonts via file read
  // Satori requires raw font data (ArrayBuffer). We bundle Inter from Google Fonts.
  // For production, fonts should be placed in public/fonts/ or fetched once.
  try {
    const fontDir = join(process.cwd(), 'public', 'fonts')
    const [regular, bold, italic] = await Promise.all([
      readFile(join(fontDir, 'Inter-Regular.ttf')),
      readFile(join(fontDir, 'Inter-Bold.ttf')),
      readFile(join(fontDir, 'Inter-Italic.ttf')),
    ])
    fontDataCache = {
      regular: regular.buffer as ArrayBuffer,
      bold: bold.buffer as ArrayBuffer,
      italic: italic.buffer as ArrayBuffer,
    }
  } catch {
    // Fallback: fetch from Google Fonts CDN (cached after first call)
    const [regular, bold, italic] = await Promise.all([
      fetch(
        'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hjQ.ttf'
      ).then((r) => r.arrayBuffer()),
      fetch(
        'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYAZ9hjQ.ttf'
      ).then((r) => r.arrayBuffer()),
      fetch(
        'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hjQ.ttf'
      ).then((r) => r.arrayBuffer()),
    ])
    fontDataCache = { regular, bold, italic }
  }

  return fontDataCache
}

// Abbreviation map for dietary tags
const TAG_ABBREV: Record<string, string> = {
  vegan: 'VN',
  vegetarian: 'V',
  'gluten-free': 'GF',
  'dairy-free': 'DF',
  'nut-free': 'NF',
  pescatarian: 'PSC',
  halal: 'H',
  kosher: 'K',
}

function buildDietaryBadges(tags: string[]) {
  if (!tags.length) return null
  return {
    type: 'div' as const,
    props: {
      style: {
        display: 'flex',
        justifyContent: 'center',
        gap: 8,
        marginTop: 8,
      },
      children: tags.map((t) => ({
        type: 'span' as const,
        props: {
          style: {
            fontSize: 14,
            letterSpacing: '0.1em',
            textTransform: 'uppercase' as const,
            color: '#aaaaaa',
            border: '1px solid #e0e0e0',
            borderRadius: 3,
            padding: '2px 10px',
          },
          children: TAG_ABBREV[t.toLowerCase()] ?? t,
        },
      })),
    },
  }
}

function buildCourseBlock(course: FOHCourse, isLast: boolean) {
  const children: any[] = []

  // Course label (small caps style)
  children.push({
    type: 'div',
    props: {
      style: {
        fontSize: 16,
        letterSpacing: '0.15em',
        textTransform: 'uppercase' as const,
        color: '#9a9a9a',
        textAlign: 'center' as const,
        marginBottom: 10,
      },
      children: course.label,
    },
  })

  // Dish name (if different from course label)
  if (course.dishName && course.dishName.toLowerCase() !== course.label.toLowerCase()) {
    children.push({
      type: 'div',
      props: {
        style: {
          fontSize: 28,
          textAlign: 'center' as const,
          color: '#1a1a1a',
          lineHeight: 1.35,
          marginBottom: 6,
        },
        children: course.dishName,
      },
    })
  }

  // Description
  if (course.description) {
    children.push({
      type: 'div',
      props: {
        style: {
          fontSize: 18,
          fontStyle: 'italic' as const,
          color: '#666666',
          textAlign: 'center' as const,
          lineHeight: 1.55,
          maxWidth: 800,
          margin: '0 auto',
        },
        children: course.description,
      },
    })
  }

  // Dietary badges
  const badges = buildDietaryBadges(course.dietaryTags)
  if (badges) children.push(badges)

  // Beverage pairing
  if (course.beveragePairing) {
    children.push({
      type: 'div',
      props: {
        style: {
          fontSize: 15,
          letterSpacing: '0.12em',
          textTransform: 'uppercase' as const,
          color: '#999999',
          textAlign: 'center' as const,
          marginTop: 12,
        },
        children: course.beveragePairing,
      },
    })
  }

  // Divider (not after last course)
  if (!isLast) {
    children.push({
      type: 'div',
      props: {
        style: {
          width: 60,
          height: 1,
          backgroundColor: '#dddddd',
          margin: '24px auto 0',
        },
        children: null,
      },
    })
  }

  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center' as const,
        marginBottom: isLast ? 0 : 36,
      },
      children,
    },
  }
}

function buildMenuJSX(data: FOHMenuData) {
  const children: any[] = []

  // Chef attribution
  if (data.chefName) {
    children.push({
      type: 'div',
      props: {
        style: {
          fontSize: 16,
          letterSpacing: '0.2em',
          textTransform: 'uppercase' as const,
          color: '#aaaaaa',
          textAlign: 'center' as const,
          marginBottom: 28,
        },
        children: `by ${data.chefName}`,
      },
    })
  }

  // Title
  const titleFontSize = data.title.length < 24 ? 48 : data.title.length < 40 ? 40 : 34
  children.push({
    type: 'div',
    props: {
      style: {
        fontSize: titleFontSize,
        fontWeight: 700,
        textAlign: 'center' as const,
        color: '#1a1a1a',
        lineHeight: 1.2,
      },
      children: data.title,
    },
  })

  // Subtitle
  if (data.subtitle) {
    children.push({
      type: 'div',
      props: {
        style: {
          fontSize: 24,
          fontStyle: 'italic' as const,
          color: '#666666',
          textAlign: 'center' as const,
          marginTop: 10,
        },
        children: data.subtitle,
      },
    })
  }

  // Client name
  if (data.clientName) {
    children.push({
      type: 'div',
      props: {
        style: {
          fontSize: 20,
          fontStyle: 'italic' as const,
          color: '#888888',
          textAlign: 'center' as const,
          marginTop: 10,
        },
        children: `for ${data.clientName}`,
      },
    })
  }

  // Date
  if (data.date) {
    children.push({
      type: 'div',
      props: {
        style: {
          fontSize: 18,
          color: '#999999',
          textAlign: 'center' as const,
          letterSpacing: '0.05em',
          marginTop: 18,
        },
        children: data.date,
      },
    })
  }

  // Service style
  if (data.serviceStyle) {
    children.push({
      type: 'div',
      props: {
        style: {
          fontSize: 16,
          color: '#bbbbbb',
          textAlign: 'center' as const,
          marginTop: 8,
          letterSpacing: '0.08em',
          textTransform: 'uppercase' as const,
        },
        children: data.serviceStyle,
      },
    })
  }

  // Decorative separator
  children.push({
    type: 'div',
    props: {
      style: {
        width: 100,
        height: 1,
        backgroundColor: '#dddddd',
        margin: '36px auto 42px',
      },
      children: null,
    },
  })

  // Courses
  if (data.courses.length > 0) {
    const courseBlocks = data.courses.map((course, i) =>
      buildCourseBlock(course, i === data.courses.length - 1)
    )
    children.push({
      type: 'div',
      props: {
        style: {
          display: 'flex',
          flexDirection: 'column' as const,
          alignItems: 'center' as const,
        },
        children: courseBlocks,
      },
    })
  } else {
    // Empty state
    children.push({
      type: 'div',
      props: {
        style: {
          fontSize: 22,
          fontStyle: 'italic' as const,
          color: '#bbbbbb',
          textAlign: 'center' as const,
          padding: '60px 0',
        },
        children: 'Menu courses are being prepared',
      },
    })
  }

  // Footer separator
  children.push({
    type: 'div',
    props: {
      style: {
        width: '100%',
        height: 1,
        backgroundColor: '#dddddd',
        marginTop: 48,
      },
      children: null,
    },
  })

  // Tagline or footer note
  if (data.tagline || data.footerNote) {
    children.push({
      type: 'div',
      props: {
        style: {
          fontSize: 18,
          fontStyle: 'italic' as const,
          color: '#bbbbbb',
          textAlign: 'center' as const,
          marginTop: 24,
          lineHeight: 1.5,
        },
        children: data.footerNote ?? data.tagline,
      },
    })
  }

  // Allergy disclaimer
  children.push({
    type: 'div',
    props: {
      style: {
        fontSize: 16,
        color: '#bbbbbb',
        textAlign: 'center' as const,
        marginTop: 18,
      },
      children: 'Please inform your chef of any food allergies',
    },
  })

  // ChefFlow attribution
  children.push({
    type: 'div',
    props: {
      style: {
        fontSize: 12,
        color: '#dddddd',
        textAlign: 'center' as const,
        marginTop: 24,
        letterSpacing: '0.1em',
        textTransform: 'uppercase' as const,
      },
      children: 'Prepared with ChefFlow',
    },
  })

  // Calculate dynamic height: base padding + header + courses + footer
  // For many courses, allow the image to grow taller than 1600
  const estimatedCourseHeight = data.courses.length * 140
  const baseHeight = 500 // header + footer + padding
  const dynamicHeight = Math.max(HEIGHT, Math.min(baseHeight + estimatedCourseHeight, 3200))

  return {
    element: {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          flexDirection: 'column' as const,
          alignItems: 'center' as const,
          justifyContent: 'center' as const,
          width: WIDTH,
          height: dynamicHeight,
          backgroundColor: '#ffffff',
          padding: '80px 80px',
        },
        children,
      },
    },
    height: dynamicHeight,
  }
}

/**
 * Generate a PNG image of a front-of-house menu from FOHMenuData.
 * Returns a Buffer containing the PNG data.
 */
export async function generateFOHMenuImage(data: FOHMenuData): Promise<Buffer> {
  const fonts = await loadFonts()
  const { element, height } = buildMenuJSX(data)

  const svg = await satori(element as any, {
    width: WIDTH,
    height,
    fonts: [
      {
        name: 'Inter',
        data: fonts.regular,
        weight: 400,
        style: 'normal',
      },
      {
        name: 'Inter',
        data: fonts.bold,
        weight: 700,
        style: 'normal',
      },
      {
        name: 'Inter',
        data: fonts.italic,
        weight: 400,
        style: 'italic',
      },
    ],
  })

  const resvg = new Resvg(svg, {
    fitTo: {
      mode: 'width',
      value: WIDTH,
    },
  })

  const pngData = resvg.render()
  return Buffer.from(pngData.asPng())
}
