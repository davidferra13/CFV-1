/**
 * MenuHierarchyComposition - Remotion animation showing the Menu → Dish → Component → Recipe hierarchy.
 *
 * Zooms into each layer to explain how they nest:
 *  Menu (container) → Dishes (items on menu) → Components (parts of a dish) → Recipes (reusable instructions)
 *
 * Helps chefs understand the 4-layer structure.
 */

import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'

/* ─── Palette ─────────────────────────────────────────────────── */

const BRAND = {
  50: '#fef9f3',
  100: '#fcf0e0',
  200: '#f8ddc0',
  400: '#eda86b',
  500: '#e88f47',
  600: '#d47530',
}

const STONE = {
  50: '#fafaf9',
  100: '#f5f5f4',
  200: '#e7e5e3',
  400: '#a8a29e',
  500: '#78716c',
  600: '#57534e',
  700: '#44403c',
  900: '#1c1917',
}

const LAYERS = [
  {
    icon: '📋',
    label: 'Menu',
    description: 'A collection of dishes for a specific event',
    example: '"New Year\'s Eve Dinner"',
    color: '#dbeafe',
    borderColor: '#93c5fd',
    textColor: '#1e40af',
  },
  {
    icon: '🍽️',
    label: 'Dish',
    description: 'An individual item on the menu',
    example: '"Pan-Seared Salmon"',
    color: '#d1fae5',
    borderColor: '#6ee7b7',
    textColor: '#065f46',
  },
  {
    icon: '🧩',
    label: 'Component',
    description: 'A building block of a dish (links to a recipe)',
    example: '"Lemon Beurre Blanc"',
    color: '#fef3c7',
    borderColor: '#fcd34d',
    textColor: '#92400e',
  },
  {
    icon: '📖',
    label: 'Recipe',
    description: 'Reusable instructions with ingredients and steps',
    example: '"Used in 3 different menus"',
    color: '#fce7f3',
    borderColor: '#f9a8d4',
    textColor: '#9d174d',
  },
]

/* ─── Timing ──────────────────────────────────────────────────── */

const INTRO = 30
const LAYER_DURATION = 70
const getLayerStart = (i: number) => INTRO + i * LAYER_DURATION

/* ─── Helpers ─────────────────────────────────────────────────── */

function useFadeIn(startFrame: number, dur = 12) {
  const frame = useCurrentFrame()
  return interpolate(frame, [startFrame, startFrame + dur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
}

function useSpringVal(startFrame: number) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  return spring({
    frame: Math.max(0, frame - startFrame),
    fps,
    config: { damping: 16, stiffness: 120 },
  })
}

/* ─── Nesting Indicator ───────────────────────────────────────── */

function NestingStack({ activeLayer }: { activeLayer: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
      {LAYERS.map((layer, i) => {
        const isActive = i <= activeLayer
        const isCurrent = i === activeLayer
        return (
          <div
            key={layer.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              paddingLeft: i * 20,
            }}
          >
            {i > 0 && <span style={{ fontSize: 10, color: STONE[400], marginRight: -4 }}>└</span>}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 6,
                backgroundColor: isActive ? layer.color : STONE[100],
                border: `1.5px solid ${isActive ? layer.borderColor : STONE[200]}`,
                boxShadow: isCurrent ? `0 0 0 2px ${BRAND[200]}` : 'none',
              }}
            >
              <span style={{ fontSize: 14 }}>{layer.icon}</span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: isActive ? layer.textColor : STONE[400],
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
              >
                {layer.label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ─── Layer Detail Card ───────────────────────────────────────── */

function LayerDetail({ layer, progress }: { layer: (typeof LAYERS)[number]; progress: number }) {
  const opacity = interpolate(progress, [0, 0.4], [0, 1], { extrapolateRight: 'clamp' })
  const translateY = interpolate(progress, [0, 1], [16, 0])

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity,
        transform: `translateY(${translateY}px)`,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          backgroundColor: layer.color,
          border: `2px solid ${layer.borderColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
          marginBottom: 10,
        }}
      >
        {layer.icon}
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: STONE[900],
          fontFamily: 'Inter, system-ui, sans-serif',
          marginBottom: 4,
        }}
      >
        {layer.label}
      </div>
      <div
        style={{
          fontSize: 12,
          color: STONE[600],
          fontFamily: 'Inter, system-ui, sans-serif',
          textAlign: 'center' as const,
          maxWidth: 320,
          marginBottom: 8,
        }}
      >
        {layer.description}
      </div>
      <div
        style={{
          fontSize: 11,
          color: layer.textColor,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontStyle: 'italic',
          backgroundColor: layer.color,
          padding: '4px 12px',
          borderRadius: 6,
        }}
      >
        {layer.example}
      </div>
    </div>
  )
}

/* ─── Main Composition ────────────────────────────────────────── */

export function MenuHierarchyComposition() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const activeLayer = LAYERS.reduce((active, _, i) => (frame >= getLayerStart(i) ? i : active), 0)
  const layerProgresses = LAYERS.map((_, i) => useSpringVal(getLayerStart(i)))

  const titleOpacity = useFadeIn(0)
  const titleY = interpolate(
    spring({ frame, fps, config: { damping: 18, stiffness: 100 } }),
    [0, 1],
    [10, 0]
  )

  return (
    <AbsoluteFill style={{ backgroundColor: 'white', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: `linear-gradient(90deg, ${BRAND[400]}, ${BRAND[500]}, ${BRAND[600]})`,
        }}
      />

      <div
        style={{ padding: '22px 28px', display: 'flex', flexDirection: 'column', height: '100%' }}
      >
        <div
          style={{
            textAlign: 'center' as const,
            marginBottom: 12,
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: BRAND[600],
              letterSpacing: '0.1em',
              textTransform: 'uppercase' as const,
              marginBottom: 4,
            }}
          >
            Menu Structure
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: STONE[900] }}>
            How menus, dishes, and recipes connect
          </div>
        </div>

        {/* Nesting indicator */}
        <NestingStack activeLayer={activeLayer} />

        {/* Detail card */}
        <div style={{ position: 'relative', flex: 1 }}>
          {LAYERS.map((layer, i) => {
            const isVisible =
              i === activeLayer ||
              (i === activeLayer - 1 && frame < getLayerStart(activeLayer) + 12)
            if (!isVisible) return null

            const exitOpacity =
              i < activeLayer
                ? interpolate(frame, [getLayerStart(i + 1), getLayerStart(i + 1) + 12], [1, 0], {
                    extrapolateLeft: 'clamp',
                    extrapolateRight: 'clamp',
                  })
                : 1

            return (
              <div
                key={layer.label}
                style={{ position: 'absolute', inset: 0, opacity: exitOpacity }}
              >
                <LayerDetail layer={layer} progress={layerProgresses[i]} />
              </div>
            )
          })}
        </div>
      </div>
    </AbsoluteFill>
  )
}
