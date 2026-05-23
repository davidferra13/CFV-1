'use client'

import { useMemo, useState } from 'react'

type Mode = 'teen' | 'chef' | 'expert'
type Evidence =
  | 'measured'
  | 'database-derived'
  | 'culinary-precedent'
  | 'chef-heuristic'
  | 'personal-thesis'
  | 'speculative'
  | 'rejected/unsupported'
  | 'not-enough-evidence'

type Role =
  | 'Acid lift'
  | 'Freshness'
  | 'Crunch'
  | 'Richness'
  | 'Bitterness'
  | 'Heat'
  | 'Roast depth'
  | 'Sweetness'

type ColorFamily = {
  id: string
  label: string
  swatch: string
  textClass: string
  shades: string[]
  jobs: string[]
  status: 'pilot' | 'shell'
}

type Ingredient = {
  id: string
  name: string
  family: string
  shade: string
  appearanceLabel: string
  state: string
  texture: string
  dietaryNotes: string
  allergenNotes: string
  cultureContext: string
  identity: string
  sourceSummary: string
  caveat: string
  evidence: Evidence
  roles: Record<Role, number | null>
}

const roles: Role[] = [
  'Acid lift',
  'Freshness',
  'Crunch',
  'Richness',
  'Bitterness',
  'Heat',
  'Roast depth',
  'Sweetness',
]

const evidenceLabels: Evidence[] = [
  'measured',
  'database-derived',
  'culinary-precedent',
  'chef-heuristic',
  'personal-thesis',
  'speculative',
  'rejected/unsupported',
  'not-enough-evidence',
]

const colorFamilies: ColorFamily[] = [
  {
    id: 'white',
    label: 'White',
    swatch: '#f8f7ef',
    textClass: 'text-stone-950',
    shades: ['dairy white', 'onion white', 'rice white', 'coconut white'],
    jobs: ['creaminess', 'neutral base', 'sharp aromatics', 'soft starch'],
    status: 'shell',
  },
  {
    id: 'cream',
    label: 'Cream',
    swatch: '#efe1bd',
    textClass: 'text-stone-950',
    shades: ['buttercream', 'custard cream', 'pasta cream', 'potato flesh cream'],
    jobs: ['richness', 'soft sweetness', 'starch body', 'rounding'],
    status: 'shell',
  },
  {
    id: 'yellow',
    label: 'Yellow',
    swatch: '#e5c34b',
    textClass: 'text-stone-950',
    shades: ['lemon yellow', 'corn yellow', 'egg yolk yellow', 'turmeric yellow', 'saffron yellow'],
    jobs: ['acid cue', 'sweet starch', 'fat richness', 'spice aroma'],
    status: 'shell',
  },
  {
    id: 'orange',
    label: 'Orange',
    swatch: '#d97324',
    textClass: 'text-white',
    shades: ['carrot orange', 'squash orange', 'apricot orange', 'paprika orange'],
    jobs: ['sweet earth', 'roasted body', 'fruit acidity', 'warm spice'],
    status: 'shell',
  },
  {
    id: 'red',
    label: 'Red',
    swatch: '#b8322d',
    textClass: 'text-white',
    shades: ['tomato red', 'chile red', 'beet red', 'berry red', 'meat red'],
    jobs: ['acid', 'heat', 'earthiness', 'fruit sweetness', 'savory protein'],
    status: 'shell',
  },
  {
    id: 'pink',
    label: 'Pink',
    swatch: '#e67b9d',
    textClass: 'text-stone-950',
    shades: ['radish pink', 'grapefruit pink', 'salmon pink', 'ham pink'],
    jobs: ['peppery crunch', 'citrus bitter', 'fatty protein', 'cured salt'],
    status: 'shell',
  },
  {
    id: 'purple',
    label: 'Purple',
    swatch: '#6d3f91',
    textClass: 'text-white',
    shades: ['eggplant purple', 'cabbage purple', 'grape purple', 'berry purple'],
    jobs: ['soft flesh', 'crunch', 'tannin', 'fruit acidity'],
    status: 'shell',
  },
  {
    id: 'blue',
    label: 'Blue',
    swatch: '#315f9e',
    textClass: 'text-white',
    shades: ['blueberry blue', 'blue corn blue', 'blue cheese mold blue'],
    jobs: ['fruit sweetness', 'grain base', 'funk'],
    status: 'shell',
  },
  {
    id: 'green',
    label: 'Green',
    swatch: '#4f7d3f',
    textClass: 'text-white',
    shades: ['herb green', 'lime green', 'olive green', 'avocado green', 'brassica green'],
    jobs: ['acid lift', 'freshness', 'crunch', 'herb aroma', 'bitterness', 'fat richness'],
    status: 'pilot',
  },
  {
    id: 'brown',
    label: 'Brown',
    swatch: '#7b5634',
    textClass: 'text-white',
    shades: ['toast brown', 'coffee brown', 'mushroom brown', 'roasted nut brown', 'caramel brown'],
    jobs: ['roast depth', 'bitterness', 'umami', 'nut richness', 'sweetness'],
    status: 'shell',
  },
  {
    id: 'black',
    label: 'Black',
    swatch: '#171717',
    textClass: 'text-white',
    shades: ['char black', 'squid ink black', 'black sesame black', 'black garlic black'],
    jobs: ['char', 'salinity', 'nut depth', 'fermented sweetness'],
    status: 'shell',
  },
  {
    id: 'gray',
    label: 'Gray',
    swatch: '#7b7b76',
    textClass: 'text-white',
    shades: ['oyster gray', 'ash gray', 'mushroom gray', 'salt gray'],
    jobs: ['brine', 'smoke', 'umami', 'seasoning'],
    status: 'shell',
  },
]

const pilotIngredients: Ingredient[] = [
  {
    id: 'lime',
    name: 'Lime',
    family: 'green',
    shade: 'lime green',
    appearanceLabel: 'green peel and pale green flesh',
    state: 'raw juice and zest',
    texture: 'liquid acid, aromatic peel',
    dietaryNotes: 'generally plant-based; validate menu-specific restrictions',
    allergenNotes: 'not a major US allergen; individual citrus sensitivity remains possible',
    cultureContext:
      'highly context dependent across Mexican, Thai, Caribbean, Indian, and other cuisines',
    identity: 'acid and aroma driver',
    sourceSummary: 'pH and nutrient values are database-derived; culinary role is chef-heuristic.',
    caveat: 'Acid value does not prove perceived balance in a finished dish.',
    evidence: 'database-derived',
    roles: {
      'Acid lift': 5,
      Freshness: 4,
      Crunch: null,
      Richness: null,
      Bitterness: 2,
      Heat: null,
      'Roast depth': null,
      Sweetness: 1,
    },
  },
  {
    id: 'cucumber',
    name: 'Cucumber',
    family: 'green',
    shade: 'herb green',
    appearanceLabel: 'green skin and pale flesh',
    state: 'raw sliced',
    texture: 'cold watery crunch',
    dietaryNotes: 'generally plant-based; validate dietary setting',
    allergenNotes: 'not a major US allergen; individual sensitivity remains possible',
    cultureContext: 'freshness role varies by salad, pickle, raita, mezze, and garnish contexts',
    identity: 'cold crunch and dilution',
    sourceSummary: 'water and nutrient values are database-derived; crunch role is chef-heuristic.',
    caveat: 'Green appearance does not make it a substitute for herbs, avocado, or lime.',
    evidence: 'chef-heuristic',
    roles: {
      'Acid lift': null,
      Freshness: 4,
      Crunch: 5,
      Richness: null,
      Bitterness: 1,
      Heat: null,
      'Roast depth': null,
      Sweetness: 1,
    },
  },
  {
    id: 'parsley',
    name: 'Parsley',
    family: 'green',
    shade: 'herb green',
    appearanceLabel: 'leaf green',
    state: 'raw chopped',
    texture: 'soft leafy flecks',
    dietaryNotes: 'generally plant-based; validate medical and menu-specific restrictions',
    allergenNotes: 'not a major US allergen; individual herb sensitivity remains possible',
    cultureContext: 'background herb in some cuisines, central freshness in others',
    identity: 'fresh herb lift',
    sourceSummary:
      'identity and nutrient references are database-derived; culinary intensity is heuristic.',
    caveat: 'Herb presence does not guarantee freshness perception after cooking.',
    evidence: 'culinary-precedent',
    roles: {
      'Acid lift': null,
      Freshness: 5,
      Crunch: 1,
      Richness: null,
      Bitterness: 2,
      Heat: null,
      'Roast depth': null,
      Sweetness: null,
    },
  },
  {
    id: 'basil',
    name: 'Basil',
    family: 'green',
    shade: 'herb green',
    appearanceLabel: 'soft leaf green',
    state: 'raw torn',
    texture: 'soft leafy',
    dietaryNotes: 'generally plant-based; validate cuisine and client preference',
    allergenNotes: 'not a major US allergen; individual herb sensitivity remains possible',
    cultureContext: 'sweet herb role differs across Italian, Thai, and other basil traditions',
    identity: 'aromatic herb sweetness',
    sourceSummary:
      'source map permits identity and broad culinary precedent, not sensory certainty.',
    caveat: 'Do not infer flavor from green pigment or compound presence alone.',
    evidence: 'culinary-precedent',
    roles: {
      'Acid lift': null,
      Freshness: 4,
      Crunch: null,
      Richness: null,
      Bitterness: 1,
      Heat: null,
      'Roast depth': null,
      Sweetness: 3,
    },
  },
  {
    id: 'avocado',
    name: 'Avocado',
    family: 'green',
    shade: 'avocado green',
    appearanceLabel: 'yellow-green flesh',
    state: 'raw ripe',
    texture: 'soft creamy fat',
    dietaryNotes: 'plant-based; validate low-fat, potassium, and client-specific needs',
    allergenNotes: 'not a major US allergen; latex-fruit sensitivity may matter for some clients',
    cultureContext: 'fat and body role changes by guacamole, toast, salad, garnish, or puree',
    identity: 'creaminess and fat body',
    sourceSummary:
      'nutrient database supports fat identity; substitution fit requires full criteria.',
    caveat: 'Avocado is green like apple or cucumber, but it does not cover acid or crunch roles.',
    evidence: 'database-derived',
    roles: {
      'Acid lift': null,
      Freshness: 2,
      Crunch: null,
      Richness: 5,
      Bitterness: 1,
      Heat: null,
      'Roast depth': null,
      Sweetness: 1,
    },
  },
  {
    id: 'jalapeno',
    name: 'Jalapeno',
    family: 'green',
    shade: 'lime green',
    appearanceLabel: 'gloss green chile',
    state: 'raw sliced',
    texture: 'crisp chile flesh',
    dietaryNotes: 'plant-based; validate heat tolerance and medical restrictions',
    allergenNotes: 'not a major US allergen; nightshade sensitivity may matter',
    cultureContext: 'heat meaning varies by cuisine, audience, and preparation',
    identity: 'fresh heat',
    sourceSummary:
      'identity is database-derived; perceived heat depends on cultivar and preparation.',
    caveat: 'Green color does not predict capsaicin level.',
    evidence: 'chef-heuristic',
    roles: {
      'Acid lift': null,
      Freshness: 3,
      Crunch: 3,
      Richness: null,
      Bitterness: 1,
      Heat: 5,
      'Roast depth': null,
      Sweetness: 1,
    },
  },
  {
    id: 'kale',
    name: 'Kale',
    family: 'green',
    shade: 'brassica green',
    appearanceLabel: 'deep leafy green',
    state: 'raw or cooked',
    texture: 'leafy chew',
    dietaryNotes:
      'plant-based; validate anticoagulant and thyroid-sensitive contexts when relevant',
    allergenNotes: 'not a major US allergen; brassica sensitivity may matter',
    cultureContext: 'raw salad, braise, chip, and soup contexts change its job',
    identity: 'bitter leafy body',
    sourceSummary: 'ingredient identity is database-derived; bitterness role is chef-heuristic.',
    caveat: 'Leaf color does not prove bitterness intensity.',
    evidence: 'chef-heuristic',
    roles: {
      'Acid lift': null,
      Freshness: 2,
      Crunch: 2,
      Richness: null,
      Bitterness: 4,
      Heat: null,
      'Roast depth': 1,
      Sweetness: null,
    },
  },
  {
    id: 'green-olive',
    name: 'Green olive',
    family: 'green',
    shade: 'olive green',
    appearanceLabel: 'olive green fruit',
    state: 'brined cured',
    texture: 'firm brined bite',
    dietaryNotes: 'plant-based; validate sodium restrictions',
    allergenNotes: 'not a major US allergen; stuffing or cross-contact can add allergens',
    cultureContext: 'brine, fat, and bitterness depend on curing style and cuisine',
    identity: 'brine and savory fat',
    sourceSummary: 'database identity plus culinary precedent; cure-specific data is partial.',
    caveat: 'Preserved state matters more than shared green appearance.',
    evidence: 'culinary-precedent',
    roles: {
      'Acid lift': 2,
      Freshness: 1,
      Crunch: 2,
      Richness: 3,
      Bitterness: 3,
      Heat: null,
      'Roast depth': null,
      Sweetness: null,
    },
  },
]

const modeCopy: Record<Mode, { label: string; intro: string; proof: string }> = {
  teen: {
    label: 'Teen',
    intro:
      'Plain-language mode: green ingredients can be sour, crunchy, spicy, creamy, bitter, brined, or herbal. Color is only a visual doorway.',
    proof: 'plain role shape',
  },
  chef: {
    label: 'Chef',
    intro:
      'Chef mode: compare role, state, texture, allergen, dietary, culture, and evidence before treating ingredients as related.',
    proof: 'working culinary role shape',
  },
  expert: {
    label: 'Expert',
    intro:
      'Expert mode: every claim stays tied to evidence class, source limits, missing data, and forbidden inference rules.',
    proof: 'evidence-labeled role shape',
  },
}

const sourceCards = [
  {
    title: 'USDA FoodData Central',
    status: 'database-derived',
    note: 'Useful for identity and nutrition fields. It does not prove perceived flavor or substitution safety.',
    readiness: 80,
  },
  {
    title: 'Peer-reviewed sensory literature',
    status: 'measured',
    note: 'Accepted when the measured variable and preparation match the claim. Missing matches stay Not enough evidence.',
    readiness: 42,
  },
  {
    title: 'FlavorDB, FooDB, BitterDB',
    status: 'restricted / partial',
    note: 'Compound presence can inform research, but compound presence alone does not prove perception.',
    readiness: 48,
  },
  {
    title: 'Chef heuristic layer',
    status: 'chef-heuristic',
    note: 'Allowed for working notes when labeled. It cannot be presented as measured science.',
    readiness: 65,
  },
]

const substitutionCriteria = [
  'same culinary role',
  'same usable state',
  'compatible texture',
  'allergen safe',
  'dietary safe',
  'culture/context safe',
  'evidence confidence visible',
]

function notEnough(value: number | null) {
  return value === null ? 'Not enough evidence' : `${value}/5`
}

function formatEvidence(evidence: Evidence) {
  return evidence === 'not-enough-evidence' ? 'Not enough evidence' : evidence
}

export function ChromaticAtlasClient() {
  const [mode, setMode] = useState<Mode>('chef')
  const [selectedFamily, setSelectedFamily] = useState('green')
  const [selectedIngredient, setSelectedIngredient] = useState('lime')
  const [search, setSearch] = useState('')
  const [showMissing, setShowMissing] = useState(true)
  const [view, setView] = useState<'atlas' | 'compare' | 'claims' | 'sources'>('atlas')
  const [compareA, setCompareA] = useState('lime')
  const [compareB, setCompareB] = useState('cucumber')
  const [claim, setClaim] = useState('Same color ingredients are interchangeable.')
  const [plate, setPlate] = useState<string[]>(['lime', 'cucumber'])

  const family = colorFamilies.find((item) => item.id === selectedFamily) ?? colorFamilies[8]
  const ingredient =
    pilotIngredients.find((item) => item.id === selectedIngredient) ?? pilotIngredients[0]

  const filteredIngredients = useMemo(() => {
    const query = search.trim().toLowerCase()
    return pilotIngredients.filter((item) => {
      if (item.family !== selectedFamily) return false
      if (!query) return true
      return [item.name, item.shade, item.identity, item.state].some((value) =>
        value.toLowerCase().includes(query)
      )
    })
  }, [search, selectedFamily])

  const claimResult = useMemo(() => evaluateClaim(claim), [claim])
  const selectedPlate = plate
    .map((id) => pilotIngredients.find((item) => item.id === id))
    .filter(Boolean) as Ingredient[]
  const roleGaps = roles.filter(
    (role) => !selectedPlate.some((item) => (item.roles[role] ?? 0) >= 3)
  )

  function selectFamily(id: string) {
    setSelectedFamily(id)
    const next = pilotIngredients.find((item) => item.family === id)
    if (next) setSelectedIngredient(next.id)
  }

  function togglePlate(id: string) {
    setPlate((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 text-stone-100 sm:px-6 lg:px-8">
      <header className="overflow-hidden rounded-lg border border-stone-800 bg-stone-950">
        <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:p-6">
          <div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-amber-500/50 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">
                Experimental / evidence-labeled
              </span>
              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
                Chef-protected internal URL
              </span>
              <span className="rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-xs text-red-200">
                Same color never means same flavor
              </span>
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-normal text-stone-50 sm:text-4xl">
              Chromatic Flavor Atlas
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-300 sm:text-base">
              Color is a discovery cue only. Unknown fields render as Not enough evidence. Radar
              output is role shape only, not proof of balance, flavor, nutrition, or substitution
              safety.
            </p>
          </div>
          <div className="rounded-lg border border-stone-800 bg-stone-900/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
              Runtime and permission states
            </p>
            <ul className="mt-3 space-y-2 text-sm text-stone-300">
              <li>Loading: segment skeleton renders before the app surface.</li>
              <li>Error: route boundary stops failed claims from rendering.</li>
              <li>Permission blocked: route is chef-auth gated server-side.</li>
              <li>Partial: non-green families stay labeled Not enough evidence.</li>
            </ul>
          </div>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        {colorFamilies.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => selectFamily(item.id)}
            className={`min-h-[116px] rounded-lg border p-4 text-left transition ${
              selectedFamily === item.id
                ? 'border-amber-400 bg-stone-900'
                : 'border-stone-800 bg-stone-950 hover:border-stone-600'
            }`}
          >
            <span
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-[10px] font-bold ${item.textClass}`}
              style={{ backgroundColor: item.swatch }}
              aria-hidden="true"
            >
              {item.label.slice(0, 1)}
            </span>
            <span className="mt-3 block font-medium text-stone-100">{item.label}</span>
            <span className="mt-1 block text-xs leading-5 text-stone-400">
              {item.status === 'pilot' ? 'Evidence-rich pilot' : 'Navigable shell'}
            </span>
          </button>
        ))}
      </section>

      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-4 rounded-lg border border-stone-800 bg-stone-950 p-4 lg:sticky lg:top-4 lg:self-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">Mode</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(['teen', 'chef', 'expert'] as Mode[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setMode(item)}
                  className={`rounded-md border px-2 py-2 text-sm ${
                    mode === item
                      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-100'
                      : 'border-stone-800 bg-stone-900 text-stone-300'
                  }`}
                >
                  {modeCopy[item].label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs leading-5 text-stone-400">{modeCopy[mode].intro}</p>
          </div>

          <div>
            <label
              htmlFor="atlas-search"
              className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400"
            >
              Ingredient filter
            </label>
            <input
              id="atlas-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search lime, crunch, herb..."
              className="mt-2 w-full rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100 outline-none focus:border-amber-400"
              type="search"
            />
            <label className="mt-3 flex items-center gap-2 text-sm text-stone-300">
              <input
                type="checkbox"
                checked={showMissing}
                onChange={(event) => setShowMissing(event.target.checked)}
              />
              Show Not enough evidence fields
            </label>
          </div>

          <nav aria-label="Atlas views" className="grid gap-2">
            {[
              ['atlas', 'Atlas'],
              ['compare', 'Comparison'],
              ['claims', 'Claim gate'],
              ['sources', 'Source map'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setView(id as typeof view)}
                className={`rounded-md border px-3 py-2 text-left text-sm ${
                  view === id
                    ? 'border-amber-400 bg-amber-400/10 text-amber-100'
                    : 'border-stone-800 bg-stone-900 text-stone-300'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-200">
              Claim warning
            </p>
            <p className="mt-2 text-xs leading-5 text-red-100/90">
              The app blocks same-color substitution, pigment-proves-flavor, compound-proves-
              perception, and radar-proves-balance language.
            </p>
          </div>
        </aside>

        <main className="min-w-0 space-y-5">
          {view === 'atlas' ? (
            <>
              <section className="rounded-lg border border-stone-800 bg-stone-950 p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                      Appearance family
                    </p>
                    <h2 className="mt-1 text-2xl font-semibold text-stone-50">{family.label}</h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-300">
                      Appearance label only. This panel does not claim flavor, chemistry,
                      substitution fit, or dish balance from color.
                    </p>
                  </div>
                  <span className="rounded-full border border-stone-700 bg-stone-900 px-3 py-1 text-xs text-stone-300">
                    {family.status === 'pilot' ? 'green pilot' : 'Not enough evidence shell'}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-stone-800 bg-stone-900/70 p-4">
                    <h3 className="text-sm font-semibold text-stone-100">Shade families</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {family.shades.map((shade) => (
                        <span
                          key={shade}
                          className="rounded-full border border-stone-700 bg-stone-950 px-3 py-1 text-xs text-stone-300"
                        >
                          {shade}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-lg border border-stone-800 bg-stone-900/70 p-4">
                    <h3 className="text-sm font-semibold text-stone-100">
                      What job does this color do?
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-stone-300">
                      It does not do a job by itself. These are possible culinary jobs to
                      investigate for this appearance family.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {family.jobs.map((job) => (
                        <span
                          key={job}
                          className="rounded-full border border-emerald-800 bg-emerald-950/40 px-3 py-1 text-xs text-emerald-100"
                        >
                          {job}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {family.status === 'shell' ? (
                <ShellPanel family={family} />
              ) : (
                <section className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                  <div className="rounded-lg border border-stone-800 bg-stone-950 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold text-stone-100">Green pilot ingredients</h3>
                      <span className="rounded-full border border-stone-700 px-2.5 py-1 text-xs text-stone-400">
                        {filteredIngredients.length} visible
                      </span>
                    </div>
                    {filteredIngredients.length === 0 ? (
                      <div className="mt-4 rounded-lg border border-amber-900/60 bg-amber-950/20 p-4 text-sm text-amber-100">
                        Empty state: no pilot ingredients match this filter. Clear the search or
                        switch color families.
                      </div>
                    ) : (
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {filteredIngredients.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setSelectedIngredient(item.id)}
                            className={`rounded-lg border p-3 text-left ${
                              selectedIngredient === item.id
                                ? 'border-emerald-400 bg-emerald-950/30'
                                : 'border-stone-800 bg-stone-900 hover:border-stone-600'
                            }`}
                          >
                            <span className="text-sm font-medium text-stone-100">{item.name}</span>
                            <span className="mt-1 block text-xs text-stone-400">
                              {item.identity}
                            </span>
                            <span className="mt-2 inline-flex rounded-full border border-stone-700 px-2 py-0.5 text-[11px] text-stone-300">
                              {formatEvidence(item.evidence)}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <IngredientDetail ingredient={ingredient} mode={mode} showMissing={showMissing} />
                </section>
              )}

              <DishComposer plate={selectedPlate} gaps={roleGaps} onToggle={togglePlate} />
            </>
          ) : null}

          {view === 'compare' ? (
            <ComparePanel
              compareA={compareA}
              compareB={compareB}
              setCompareA={setCompareA}
              setCompareB={setCompareB}
            />
          ) : null}

          {view === 'claims' ? (
            <ClaimGate claim={claim} setClaim={setClaim} result={claimResult} />
          ) : null}

          {view === 'sources' ? <SourceMap /> : null}
        </main>
      </div>
    </div>
  )
}

function ShellPanel({ family }: { family: ColorFamily }) {
  return (
    <section className="rounded-lg border border-stone-800 bg-stone-950 p-4 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-stone-100">{family.label} research shell</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-300">
            This family is navigable so the atlas can grow, but ingredient-level evidence is not
            sourced yet. Missing fields are intentionally labeled Not enough evidence.
          </p>
        </div>
        <span className="rounded-full border border-amber-700 bg-amber-950/40 px-3 py-1 text-xs text-amber-100">
          Partial state
        </span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {family.shades.map((shade) => (
          <article key={shade} className="rounded-lg border border-stone-800 bg-stone-900/70 p-4">
            <h4 className="font-medium text-stone-100">{shade}</h4>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-stone-500">Evidence</dt>
                <dd className="text-right text-amber-100">Not enough evidence</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-stone-500">Ingredient detail</dt>
                <dd className="text-right text-stone-300">Not enough evidence</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-stone-500">Role chart</dt>
                <dd className="text-right text-stone-300">Not plotted as zero</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  )
}

function IngredientDetail({
  ingredient,
  mode,
  showMissing,
}: {
  ingredient: Ingredient
  mode: Mode
  showMissing: boolean
}) {
  const visibleRoles = roles.filter((role) => showMissing || ingredient.roles[role] !== null)

  return (
    <article className="rounded-lg border border-stone-800 bg-stone-950 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-stone-50">{ingredient.name}</h3>
          <p className="mt-1 text-sm text-stone-400">{ingredient.identity}</p>
        </div>
        <span className="rounded-full border border-stone-700 bg-stone-900 px-3 py-1 text-xs text-stone-300">
          {modeCopy[mode].proof}
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {[
          ['Appearance label', ingredient.appearanceLabel],
          ['State', ingredient.state],
          ['Texture', ingredient.texture],
          ['Evidence', formatEvidence(ingredient.evidence)],
          ['Allergen safety', ingredient.allergenNotes],
          ['Dietary safety', ingredient.dietaryNotes],
          ['Culture/context safety', ingredient.cultureContext],
          ['Caveat', ingredient.caveat],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-stone-800 bg-stone-900/70 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
              {label}
            </p>
            <p className="mt-1 text-sm leading-5 text-stone-200">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <RoleRadar items={[ingredient]} />
        <div className="overflow-x-auto rounded-lg border border-stone-800">
          <table className="min-w-full divide-y divide-stone-800 text-sm">
            <caption className="sr-only">
              Accessible table fallback for role shape. Missing values are Not enough evidence.
            </caption>
            <thead className="bg-stone-900">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-stone-400">
                  Role
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-stone-400">
                  Shape
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-stone-400">
                  Evidence
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800 bg-stone-950">
              {visibleRoles.map((role) => (
                <tr key={role}>
                  <td className="px-3 py-2 text-stone-200">{role}</td>
                  <td className="px-3 py-2 text-stone-300">{notEnough(ingredient.roles[role])}</td>
                  <td className="px-3 py-2 text-stone-400">
                    {ingredient.roles[role] === null
                      ? 'Not enough evidence'
                      : ingredient.sourceSummary}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </article>
  )
}

function RoleRadar({ items }: { items: Ingredient[] }) {
  const center = 150
  const radius = 104
  const colors = ['#84cc16', '#38bdf8']

  function point(roleIndex: number, value: number) {
    const angle = -Math.PI / 2 + (roleIndex * Math.PI * 2) / roles.length
    const distance = (radius * value) / 5
    return [center + Math.cos(angle) * distance, center + Math.sin(angle) * distance]
  }

  return (
    <div className="rounded-lg border border-stone-800 bg-stone-900/50 p-3">
      <p className="mb-2 text-xs text-stone-400">Radar is role shape only, not proof.</p>
      <svg viewBox="0 0 300 300" role="img" aria-label="Role shape radar chart">
        {[1, 2, 3, 4, 5].map((ring) => {
          const points = roles
            .map((_, index) =>
              point(index, ring)
                .map((value) => value.toFixed(1))
                .join(',')
            )
            .join(' ')
          return <polygon key={ring} points={points} fill="none" stroke="#44403c" strokeWidth="1" />
        })}
        {roles.map((role, index) => {
          const [x, y] = point(index, 5.55)
          const [x2, y2] = point(index, 5)
          return (
            <g key={role}>
              <line x1={center} y1={center} x2={x2} y2={y2} stroke="#44403c" strokeWidth="1" />
              <text
                x={x}
                y={y}
                textAnchor={x < center - 8 ? 'end' : x > center + 8 ? 'start' : 'middle'}
                className="fill-stone-400 text-[9px]"
              >
                {role.replace(' ', '\n')}
              </text>
            </g>
          )
        })}
        {items.map((item, itemIndex) => {
          const known = roles
            .map((role, index) => ({ value: item.roles[role], index }))
            .filter((entry): entry is { value: number; index: number } => entry.value !== null)
          const points = known
            .map((entry) =>
              point(entry.index, entry.value)
                .map((value) => value.toFixed(1))
                .join(',')
            )
            .join(' ')
          return (
            <polygon
              key={item.id}
              points={points}
              fill={colors[itemIndex]}
              fillOpacity="0.18"
              stroke={colors[itemIndex]}
              strokeWidth="2"
            />
          )
        })}
      </svg>
    </div>
  )
}

function DishComposer({
  plate,
  gaps,
  onToggle,
}: {
  plate: Ingredient[]
  gaps: Role[]
  onToggle: (id: string) => void
}) {
  return (
    <section className="rounded-lg border border-stone-800 bg-stone-950 p-4 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-stone-100">Dish composer stub</h3>
          <p className="mt-2 text-sm leading-6 text-stone-300">
            Add pilot ingredients to inspect role gaps. This does not generate recipes or automatic
            substitutions.
          </p>
        </div>
        <span className="rounded-full border border-stone-700 px-3 py-1 text-xs text-stone-300">
          {plate.length} on plate
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {pilotIngredients.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onToggle(item.id)}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              plate.some((selected) => selected.id === item.id)
                ? 'border-emerald-500 bg-emerald-500/15 text-emerald-100'
                : 'border-stone-700 bg-stone-900 text-stone-300'
            }`}
          >
            {item.name}
          </button>
        ))}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-stone-800 bg-stone-900/70 p-4">
          <h4 className="font-medium text-stone-100">Current plate roles</h4>
          <p className="mt-2 text-sm text-stone-300">
            {plate.length > 0
              ? plate.map((item) => item.name).join(', ')
              : 'Empty state: no ingredients selected.'}
          </p>
        </div>
        <div className="rounded-lg border border-stone-800 bg-stone-900/70 p-4">
          <h4 className="font-medium text-stone-100">Visible role gaps</h4>
          <p className="mt-2 text-sm leading-6 text-stone-300">
            {gaps.length > 0 ? gaps.join(', ') : 'No major role gap in the pilot shape.'}
          </p>
        </div>
      </div>
    </section>
  )
}

function ComparePanel({
  compareA,
  compareB,
  setCompareA,
  setCompareB,
}: {
  compareA: string
  compareB: string
  setCompareA: (value: string) => void
  setCompareB: (value: string) => void
}) {
  const a = pilotIngredients.find((item) => item.id === compareA) ?? pilotIngredients[0]
  const b = pilotIngredients.find((item) => item.id === compareB) ?? pilotIngredients[1]

  return (
    <section className="space-y-5">
      <div className="rounded-lg border border-stone-800 bg-stone-950 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-stone-100">
              Comparison and substitution gate
            </h2>
            <p className="mt-2 text-sm leading-6 text-stone-300">
              Compare roles without treating color as substitution proof.
            </p>
          </div>
          <span className="rounded-full border border-red-800 bg-red-950/40 px-3 py-1 text-xs text-red-100">
            No color-only substitution
          </span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[compareA, compareB].map((value, index) => (
            <select
              key={index}
              value={value}
              onChange={(event) =>
                index === 0 ? setCompareA(event.target.value) : setCompareB(event.target.value)
              }
              className="rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100"
              aria-label={index === 0 ? 'First ingredient' : 'Second ingredient'}
            >
              {pilotIngredients.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          ))}
        </div>
        <div className="mt-5 grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
          <RoleRadar items={[a, b]} />
          <SubstitutionExamples />
        </div>
      </div>
    </section>
  )
}

function SubstitutionExamples() {
  return (
    <div className="space-y-3">
      <article className="rounded-lg border border-emerald-800 bg-emerald-950/20 p-4">
        <h3 className="font-semibold text-emerald-100">Good role-based example</h3>
        <p className="mt-2 text-sm leading-6 text-stone-300">
          If celery is unavailable and the dish needs cold crunch, cucumber may cover the crunch
          role after allergen, dietary, culture/context, and water-release checks. It is not chosen
          because it is green.
        </p>
      </article>
      <article className="rounded-lg border border-red-800 bg-red-950/20 p-4">
        <h3 className="font-semibold text-red-100">Bad same-color example</h3>
        <p className="mt-2 text-sm leading-6 text-stone-300">
          Avocado is green like cucumber and apple, but it fails the acid/crunch job. Cucumber plus
          lime may cover cold crunch and acid lift better than avocado alone.
        </p>
      </article>
      <div className="rounded-lg border border-stone-800 bg-stone-900/70 p-4">
        <h3 className="font-semibold text-stone-100">Required gate criteria</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {substitutionCriteria.map((criterion) => (
            <span
              key={criterion}
              className="rounded-full border border-stone-700 bg-stone-950 px-3 py-1 text-xs text-stone-300"
            >
              {criterion}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function ClaimGate({
  claim,
  setClaim,
  result,
}: {
  claim: string
  setClaim: (value: string) => void
  result: { blocked: boolean; title: string; detail: string }
}) {
  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="rounded-lg border border-stone-800 bg-stone-950 p-4 sm:p-5">
        <h2 className="text-xl font-semibold text-stone-100">Claim gate</h2>
        <p className="mt-2 text-sm leading-6 text-stone-300">
          Test copy before it enters the atlas. The gate blocks overclaims and labels allowed
          statements as scoped.
        </p>
        <textarea
          value={claim}
          onChange={(event) => setClaim(event.target.value)}
          className="mt-4 min-h-36 w-full rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            'Cucumber can replace celery when the dish needs cold crunch, after allergen and dietary checks.',
            'Pigment proves flavor.',
            'Compound presence proves perception.',
            'Radar proves this plate is balanced.',
            'USDA FDC reports nutrient values for cucumber raw; this does not prove flavor.',
          ].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setClaim(preset)}
              className="rounded-full border border-stone-700 bg-stone-900 px-3 py-1.5 text-xs text-stone-300 hover:border-stone-500"
            >
              {preset}
            </button>
          ))}
        </div>
      </div>
      <div
        className={`rounded-lg border p-4 sm:p-5 ${
          result.blocked ? 'border-red-800 bg-red-950/20' : 'border-emerald-800 bg-emerald-950/20'
        }`}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
          Gate result
        </p>
        <h3 className="mt-2 text-xl font-semibold text-stone-100">{result.title}</h3>
        <p className="mt-3 text-sm leading-6 text-stone-300">{result.detail}</p>
      </div>
    </section>
  )
}

function SourceMap() {
  return (
    <section className="space-y-5">
      <div className="rounded-lg border border-stone-800 bg-stone-950 p-4 sm:p-5">
        <h2 className="text-xl font-semibold text-stone-100">Source governance map</h2>
        <p className="mt-2 text-sm leading-6 text-stone-300">
          Every source class has a permitted use and a boundary. Restricted, rejected, speculative,
          and missing evidence cannot be promoted into finished claims.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {sourceCards.map((source) => (
            <article
              key={source.title}
              className="rounded-lg border border-stone-800 bg-stone-900/70 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-stone-100">{source.title}</h3>
                <span className="rounded-full border border-stone-700 px-2 py-0.5 text-xs text-stone-300">
                  {source.status}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-stone-300">{source.note}</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-800">
                <div className="h-full bg-emerald-500" style={{ width: `${source.readiness}%` }} />
              </div>
            </article>
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-stone-800 bg-stone-950 p-4 sm:p-5">
        <h3 className="font-semibold text-stone-100">Evidence strip</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {evidenceLabels.map((label) => (
            <span
              key={label}
              className="rounded-full border border-stone-700 bg-stone-900 px-3 py-1 text-xs text-stone-300"
            >
              {formatEvidence(label)}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

function evaluateClaim(text: string) {
  const normalized = text.toLowerCase()
  const blockedPatterns = [
    'same color',
    'interchangeable',
    'pigment proves',
    'compound presence proves',
    'compound proves',
    'radar proves',
    'proves balance',
    'palette-to-menu',
    'client preference memory',
    'culture lens',
    'r&d notebook',
    'chef council',
    'panic button',
  ]

  const hit = blockedPatterns.find((pattern) => normalized.includes(pattern))
  if (hit) {
    return {
      blocked: true,
      title: 'Blocked overclaim',
      detail: `The claim contains "${hit}". The atlas cannot claim same-color interchangeability, pigment-to-flavor proof, compound-to-perception proof, radar proof, or unfinished future features as complete.`,
    }
  }

  if (normalized.includes('not enough evidence')) {
    return {
      blocked: false,
      title: 'Allowed as missing evidence',
      detail:
        'This can appear when the missing field remains explicit and is not plotted or treated as zero.',
    }
  }

  return {
    blocked: false,
    title: 'Allowed only as scoped working copy',
    detail:
      'The claim does not trip the hard blockers. Keep role, state, texture, safety, culture/context, and evidence confidence visible.',
  }
}
