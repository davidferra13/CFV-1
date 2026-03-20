/* eslint-disable @next/next/no-img-element */
'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Search,
  X,
  Wallet,
  ScanLine,
} from '@/components/ui/icons'
import { counterCheckout } from '@/lib/commerce/checkout-actions'
import { createOrderQueueEntry } from '@/lib/commerce/order-queue-actions'
import {
  openRegister,
  closeRegister,
  resumeRegister,
  suspendRegister,
} from '@/lib/commerce/register-actions'
import {
  getCashDrawerSummary,
  listCashDrawerMovements,
  recordCashAdjustment,
  recordCashNoSaleOpen,
  recordCashPaidIn,
  recordCashPaidOut,
} from '@/lib/commerce/cash-drawer-actions'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Download } from '@/components/ui/icons'
import { PRODUCT_CATEGORY_LABELS } from '@/lib/commerce/constants'
import type { ProductCategory, TaxClass } from '@/lib/commerce/constants'
import {
  generateReceipt,
  getReceiptDeliveryTargets,
  sendReceiptByEmail,
  sendReceiptBySms,
} from '@/lib/commerce/receipt-actions'
import {
  createQuickBarcodeProduct,
  snapshotProductFromRecipe,
} from '@/lib/commerce/product-actions'
import { formatCurrency, parseCurrencyToCents } from '@/lib/utils/currency'
import type { TerminalHealth } from '@/lib/commerce/terminal'
import { getPosHardwareStack, type PosHardwareCapabilities } from '@/lib/commerce/hardware'
import { hasTaxableItems } from '@/lib/commerce/tax-policy'
import { computeLineTaxCents } from '@/lib/commerce/kiosk-policy'
import { closeDiningCheck } from '@/lib/commerce/table-service-actions'

type Product = {
  id: string
  name: string
  barcode?: string | null
  price_cents: number
  category: string | null
  image_url: string | null
  is_active: boolean
  modifiers: any[]
  tax_class: string
  cost_cents: number | null
  track_inventory: boolean | null
  available_qty: number | null
  low_stock_threshold: number | null
}

type CartItem = {
  id: string
  productProjectionId?: string
  product: Product
  quantity: number
  modifiersApplied: Array<{ name: string; option: string; price_delta_cents: number }>
  unitPriceCents: number
}

type RecipeOption = {
  id: string
  name: string
  category: string | null
  totalCostCents: number | null
  hasAllPrices: boolean | null
}

type QuickPricePresetId = 'x2_5' | 'x3' | 'food_cost_35'

type RecentTransaction = {
  saleId: string
  saleNumber: string
  status: string
  totalCents: number
  createdAt: string
  paymentMethod: string | null
  paymentStatus: string | null
}

type ActivePromotionHint = {
  code: string
  name: string
  autoApply: boolean
}

type OpenDiningCheckHint = {
  id: string
  tableLabel: string
  guestName: string | null
  guestCount: number | null
  openedAt: string
}

type Props = {
  products: Product[]
  recipeOptions: RecipeOption[]
  registerSession: any | null
  defaultTaxZip?: string
  defaultTaxRate?: number
  taxServiceAvailable?: boolean
  terminalHealth?: TerminalHealth
  hardwareCapabilities?: PosHardwareCapabilities
  recentTransactions?: RecentTransaction[]
  closeVarianceReasonThresholdCents?: number
  managerApprovalRequired?: boolean
  roleMatrixRequired?: boolean
  activePromotions?: ActivePromotionHint[]
  openDiningChecks?: OpenDiningCheckHint[]
}

type DrawerSummary = {
  expectedCashCents: number
  movementNetCents: number
  openingCashCents: number
  breakdown: {
    salePaymentCents: number
    refundCents: number
    paidInCents: number
    paidOutCents: number
    adjustmentCents: number
  }
}

const CART_STORAGE_KEY = 'chefflow_pos_cart_v1'

function buildCheckoutAttemptKey() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}_${Math.random().toString(36).slice(2)}`
}

function modifierSignature(modifiers: Array<{ name: string; option: string }>) {
  return modifiers
    .map((modifier) => `${modifier.name}:${modifier.option}`)
    .sort()
    .join('|')
}

function suggestSellPriceCents(costCents: number | null) {
  if (!costCents || costCents <= 0) return 0
  return Math.max(Math.round(costCents * 3), costCents + 200)
}

function roundMenuPriceCents(value: number) {
  return Math.ceil(value / 5) * 5
}

function getPresetSellPriceCents(costCents: number, preset: QuickPricePresetId) {
  if (preset === 'x2_5') return roundMenuPriceCents(costCents * 2.5)
  if (preset === 'x3') return roundMenuPriceCents(costCents * 3)
  return roundMenuPriceCents(costCents / 0.35)
}

function formatTransactionTime(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Unknown time'
  return parsed.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

const QUICK_ITEM_TAX_OPTIONS: Array<{ value: TaxClass; label: string }> = [
  { value: 'prepared_food', label: 'Prepared Food' },
  { value: 'standard', label: 'Standard' },
  { value: 'exempt', label: 'Exempt' },
  { value: 'zero', label: 'Zero Rate' },
  { value: 'reduced', label: 'Reduced' },
]

function buildQuickItemId(name: string, priceCents: number, taxClass: TaxClass) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return `custom_${slug || 'item'}_${priceCents}_${taxClass}`
}

export function PosRegister({
  products,
  recipeOptions,
  registerSession,
  defaultTaxZip,
  defaultTaxRate = 0,
  taxServiceAvailable = true,
  terminalHealth,
  hardwareCapabilities,
  recentTransactions = [],
  closeVarianceReasonThresholdCents = 500,
  managerApprovalRequired = false,
  roleMatrixRequired = false,
  activePromotions = [],
  openDiningChecks = [],
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState('')
  const [barcodeInput, setBarcodeInput] = useState('')
  const [runtimeBarcodeProducts, setRuntimeBarcodeProducts] = useState<Record<string, Product>>({})
  const [unmappedBarcode, setUnmappedBarcode] = useState<string | null>(null)
  const [unmappedProductName, setUnmappedProductName] = useState('')
  const [unmappedProductPrice, setUnmappedProductPrice] = useState('')
  const [showQuickSandwich, setShowQuickSandwich] = useState(false)
  const [quickRecipeSearch, setQuickRecipeSearch] = useState('')
  const [quickRecipeId, setQuickRecipeId] = useState('')
  const [quickSellPrice, setQuickSellPrice] = useState('')
  const [quickPricePreset, setQuickPricePreset] = useState<QuickPricePresetId | null>(null)
  const [showQuickItem, setShowQuickItem] = useState(false)
  const [quickItemName, setQuickItemName] = useState('')
  const [quickItemPrice, setQuickItemPrice] = useState('')
  const [quickItemQty, setQuickItemQty] = useState('1')
  const [quickItemTaxClass, setQuickItemTaxClass] = useState<TaxClass>('prepared_food')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [lastSale, setLastSale] = useState<{
    saleId: string
    saleNumber: string
    totalCents: number
    changeDueCents: number
  } | null>(null)
  const [receiptEmail, setReceiptEmail] = useState('')
  const [receiptPhone, setReceiptPhone] = useState('')
  const [isSendingReceiptEmail, setIsSendingReceiptEmail] = useState(false)
  const [isSendingReceiptSms, setIsSendingReceiptSms] = useState(false)
  const [isLoadingReceiptTargets, setIsLoadingReceiptTargets] = useState(false)
  const [recentTransactionSearch, setRecentTransactionSearch] = useState('')
  const [recentTransactionRows, setRecentTransactionRows] =
    useState<RecentTransaction[]>(recentTransactions)

  const [hydratedCart, setHydratedCart] = useState(false)

  // Register open/close state
  const [showOpenRegister, setShowOpenRegister] = useState(false)
  const [openingCash, setOpeningCash] = useState('')
  const [showCloseRegister, setShowCloseRegister] = useState(false)
  const [closingCash, setClosingCash] = useState('')
  const [closingNotes, setClosingNotes] = useState('')
  const [showSuspendRegister, setShowSuspendRegister] = useState(false)
  const [suspendNotes, setSuspendNotes] = useState('')

  // Tip + cash tender
  const [tipInput, setTipInput] = useState('0.00')
  const [cashTendered, setCashTendered] = useState('')
  const [splitCardAmount, setSplitCardAmount] = useState('')
  const [promotionCode, setPromotionCode] = useState('')
  const [selectedDiningCheckId, setSelectedDiningCheckId] = useState('')
  const [ageVerified, setAgeVerified] = useState(false)

  // Modifier popup state
  const [modifierProduct, setModifierProduct] = useState<Product | null>(null)
  const [modifierSelections, setModifierSelections] = useState<Record<string, string>>({})

  // Drawer state
  const [drawerSummary, setDrawerSummary] = useState<DrawerSummary | null>(null)
  const [drawerMovements, setDrawerMovements] = useState<any[]>([])
  const [drawerAction, setDrawerAction] = useState<
    'paid_in' | 'paid_out' | 'adjustment' | 'no_sale' | null
  >(null)
  const [drawerAmount, setDrawerAmount] = useState('')
  const [drawerNotes, setDrawerNotes] = useState('')
  const [pendingPrintJobs, setPendingPrintJobs] = useState(0)
  const [isCheckoutSubmitting, setIsCheckoutSubmitting] = useState(false)
  const checkoutRequestKeyRef = useRef<string | null>(null)
  const printQueueRef = useRef<Promise<void>>(Promise.resolve())
  const registerStatus = registerSession?.status ?? null
  const isRegisterOpen = registerStatus === 'open'
  const hardware = useMemo(() => getPosHardwareStack(hardwareCapabilities), [hardwareCapabilities])

  // Filter products
  const filteredProducts = useMemo(() => {
    let filtered = products.filter((p: Product) => p.is_active)
    if (search) {
      const s = search.toLowerCase()
      filtered = filtered.filter((p: Product) => p.name.toLowerCase().includes(s))
    }
    if (categoryFilter) {
      filtered = filtered.filter((p: Product) => p.category === categoryFilter)
    }
    return filtered
  }, [products, search, categoryFilter])

  const categories = useMemo(() => {
    const cats = new Set<string>()
    for (const p of products) {
      if (p.category) cats.add(p.category)
    }
    return Array.from(cats).sort()
  }, [products])

  const barcodeProductMap = useMemo(() => {
    const map = new Map<string, Product>()
    for (const product of products) {
      if (!product.is_active) continue
      const rawBarcode = String(product.barcode ?? '').trim()
      if (!rawBarcode) continue
      if (!map.has(rawBarcode)) {
        map.set(rawBarcode, product)
      }
    }
    return map
  }, [products])

  const filteredRecipeOptions = useMemo(() => {
    const term = quickRecipeSearch.trim().toLowerCase()
    return recipeOptions
      .filter((recipe) => {
        if (!term) return true
        return recipe.name.toLowerCase().includes(term)
      })
      .slice(0, 24)
  }, [recipeOptions, quickRecipeSearch])

  const quickRecipe = useMemo(
    () => recipeOptions.find((recipe) => recipe.id === quickRecipeId) ?? null,
    [recipeOptions, quickRecipeId]
  )
  const quickRecipeHasCost = !!(
    quickRecipe &&
    quickRecipe.totalCostCents != null &&
    quickRecipe.totalCostCents > 0
  )
  const quickFoodCostPercent = useMemo(() => {
    if (!quickRecipe || quickRecipe.totalCostCents == null || quickRecipe.totalCostCents <= 0) {
      return null
    }
    const priceCents = parseCurrencyToCents(quickSellPrice || '0')
    if (priceCents <= 0) return null
    return Number(((quickRecipe.totalCostCents / priceCents) * 100).toFixed(1))
  }, [quickRecipe, quickSellPrice])
  const cartHasTaxableItems = useMemo(
    () =>
      hasTaxableItems(
        cart.map((item) => ({
          taxClass: (item.product.tax_class as any) ?? 'standard',
        }))
      ),
    [cart]
  )
  const cartHasAgeRestrictedItems = useMemo(
    () =>
      cart.some((item) => {
        const taxClass = String(item.product.tax_class ?? '').toLowerCase()
        return taxClass === 'alcohol' || taxClass === 'cannabis'
      }),
    [cart]
  )
  const estimatedTaxCents = useMemo(() => {
    if (!cartHasTaxableItems || !defaultTaxZip || defaultTaxRate <= 0) return 0

    return cart.reduce(
      (sum, item) =>
        sum +
        computeLineTaxCents({
          lineTotalCents: item.unitPriceCents * item.quantity,
          combinedRate: defaultTaxRate,
          taxClass: item.product.tax_class,
        }),
      0
    )
  }, [cart, cartHasTaxableItems, defaultTaxRate, defaultTaxZip])
  const taxBlockingMessage = useMemo(() => {
    if (!cartHasTaxableItems) return null
    if (!defaultTaxZip) {
      return 'Tax ZIP is required for taxable items. Set your business ZIP before checkout.'
    }
    if (!taxServiceAvailable) {
      return 'Tax service unavailable. Unable to calculate sales tax right now.'
    }
    return null
  }, [cartHasTaxableItems, defaultTaxZip, taxServiceAvailable])
  const cardTerminalBlockingMessage =
    terminalHealth && !terminalHealth.healthy
      ? `Card terminal unavailable: ${terminalHealth.message}`
      : null

  const subtotalCents = useMemo(
    () => cart.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0),
    [cart]
  )
  const tipCents = useMemo(() => parseCurrencyToCents(tipInput || '0'), [tipInput])
  const totalDueCents = subtotalCents + estimatedTaxCents + tipCents
  const cashTenderedCents = useMemo(() => parseCurrencyToCents(cashTendered || '0'), [cashTendered])
  const insufficientCashTendered = totalDueCents > 0 && cashTenderedCents < totalDueCents
  const splitCardAmountCents = useMemo(
    () => parseCurrencyToCents(splitCardAmount || '0'),
    [splitCardAmount]
  )
  const splitCashPortionCents = Math.max(0, totalDueCents - splitCardAmountCents)
  const isSplitConfigurationActive = splitCardAmount.trim().length > 0
  const isSplitAmountInvalid =
    isSplitConfigurationActive &&
    (splitCardAmountCents <= 0 || splitCardAmountCents >= totalDueCents)
  const insufficientSplitCashTendered =
    isSplitConfigurationActive && !isSplitAmountInvalid && cashTenderedCents < splitCashPortionCents
  const filteredRecentTransactions = useMemo(() => {
    const term = recentTransactionSearch.trim().toLowerCase()
    const rows = recentTransactionRows
    if (!term) return rows.slice(0, 12)
    return rows
      .filter((row) => {
        const saleNumber = row.saleNumber.toLowerCase()
        const total = formatCurrency(row.totalCents).toLowerCase()
        return saleNumber.includes(term) || total.includes(term)
      })
      .slice(0, 12)
  }, [recentTransactionRows, recentTransactionSearch])
  const promotionHint = useMemo(() => {
    const normalized = promotionCode.trim().toUpperCase()
    if (!normalized) return null
    return activePromotions.find((promotion) => promotion.code === normalized) ?? null
  }, [promotionCode, activePromotions])
  const selectedDiningCheck = useMemo(
    () => openDiningChecks.find((check) => check.id === selectedDiningCheckId) ?? null,
    [openDiningChecks, selectedDiningCheckId]
  )
  const closingCashCents = useMemo(() => parseCurrencyToCents(closingCash || '0'), [closingCash])
  const expectedClosingCashCents = drawerSummary?.expectedCashCents ?? 0
  const closingVarianceCents = closingCash.trim() ? closingCashCents - expectedClosingCashCents : 0
  const closingVarianceNeedsReason =
    !!drawerSummary && Math.abs(closingVarianceCents) > closeVarianceReasonThresholdCents

  useEffect(() => {
    if (totalDueCents <= 0) {
      setCashTendered('')
      return
    }

    if (!cashTendered) {
      setCashTendered((totalDueCents / 100).toFixed(2))
    }
  }, [totalDueCents, cashTendered])

  useEffect(() => {
    if (!cartHasAgeRestrictedItems && ageVerified) {
      setAgeVerified(false)
    }
  }, [cartHasAgeRestrictedItems, ageVerified])

  useEffect(() => {
    if (!showQuickSandwich || quickRecipeId) return
    const preferred =
      recipeOptions.find((recipe) => recipe.name.toLowerCase().includes('sandwich')) ??
      recipeOptions[0]
    if (preferred) {
      setQuickRecipeId(preferred.id)
    }
  }, [showQuickSandwich, quickRecipeId, recipeOptions])

  useEffect(() => {
    if (!showQuickSandwich || !quickRecipe) return
    if (quickSellPrice.trim()) return
    const suggested = suggestSellPriceCents(quickRecipe.totalCostCents)
    if (suggested > 0) {
      setQuickSellPrice((suggested / 100).toFixed(2))
      setQuickPricePreset('x3')
    }
  }, [showQuickSandwich, quickRecipe, quickSellPrice])

  useEffect(() => {
    if (hydratedCart) return

    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY)
      if (!raw) {
        setHydratedCart(true)
        return
      }

      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) {
        setHydratedCart(true)
        return
      }

      const restored: CartItem[] = parsed
        .map<CartItem | null>((item: any) => {
          const customProduct = item?.customProduct
          const product =
            customProduct &&
            typeof customProduct.name === 'string' &&
            Number.isInteger(customProduct.price_cents)
              ? ({
                  id:
                    typeof item.productId === 'string'
                      ? item.productId
                      : buildQuickItemId(
                          customProduct.name,
                          Number(customProduct.price_cents),
                          (customProduct.tax_class as TaxClass) ?? 'prepared_food'
                        ),
                  name: customProduct.name,
                  barcode: null,
                  price_cents: Number(customProduct.price_cents),
                  category: null,
                  image_url: null,
                  is_active: true,
                  modifiers: [],
                  tax_class: String(customProduct.tax_class ?? 'prepared_food'),
                  cost_cents: null,
                  track_inventory: false,
                  available_qty: null,
                  low_stock_threshold: null,
                } as Product)
              : products.find((p) => p.id === item.productId)
          const quantity = Number(item.quantity)
          if (!product || !Number.isInteger(quantity) || quantity <= 0) return null
          const modifiersApplied = Array.isArray(item.modifiersApplied)
            ? item.modifiersApplied
                .map((modifier: any) => ({
                  name: String(modifier?.name ?? ''),
                  option: String(modifier?.option ?? ''),
                  price_delta_cents: Number(modifier?.price_delta_cents ?? 0),
                }))
                .filter(
                  (modifier: any) =>
                    modifier.name && modifier.option && Number.isInteger(modifier.price_delta_cents)
                )
            : []
          const signature = modifierSignature(modifiersApplied)
          const id = `${product.id}::${signature}`
          const modifierDelta = modifiersApplied.reduce(
            (sum: number, modifier: any) => sum + modifier.price_delta_cents,
            0
          )
          const restoredItem: CartItem = {
            id,
            product,
            quantity,
            modifiersApplied,
            unitPriceCents: product.price_cents + modifierDelta,
          }

          if (typeof item.productProjectionId === 'string') {
            restoredItem.productProjectionId = item.productProjectionId
          } else if (!customProduct) {
            restoredItem.productProjectionId = product.id
          }

          return restoredItem
        })
        .filter((x): x is CartItem => Boolean(x))

      setCart(restored)
    } catch {
      // ignore malformed cache
    } finally {
      setHydratedCart(true)
    }
  }, [products, hydratedCart])

  useEffect(() => {
    if (!hydratedCart) return

    const payload = cart.map((item) => ({
      productId: item.product.id,
      productProjectionId: item.productProjectionId ?? null,
      quantity: item.quantity,
      modifiersApplied: item.modifiersApplied,
      customProduct: item.productProjectionId
        ? null
        : {
            name: item.product.name,
            price_cents: item.product.price_cents,
            tax_class: item.product.tax_class,
          },
    }))
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(payload))
  }, [cart, hydratedCart])

  useEffect(() => {
    if (isCheckoutSubmitting) return
    checkoutRequestKeyRef.current = null
  }, [cart, tipInput, isCheckoutSubmitting])

  useEffect(() => {
    setRecentTransactionRows(recentTransactions)
  }, [recentTransactions])

  useEffect(() => {
    if (!selectedDiningCheckId) return
    const stillExists = openDiningChecks.some((check) => check.id === selectedDiningCheckId)
    if (!stillExists) {
      setSelectedDiningCheckId('')
    }
  }, [openDiningChecks, selectedDiningCheckId])

  const refreshDrawerData = useCallback(async () => {
    if (!registerSession?.id) {
      setDrawerSummary(null)
      setDrawerMovements([])
      return
    }

    try {
      const [summary, movementData] = await Promise.all([
        getCashDrawerSummary(registerSession.id),
        listCashDrawerMovements({ registerSessionId: registerSession.id, limit: 20 }),
      ])
      setDrawerSummary(summary as DrawerSummary)
      setDrawerMovements(movementData.movements ?? [])
    } catch {
      setDrawerSummary(null)
      setDrawerMovements([])
    }
  }, [registerSession?.id])

  useEffect(() => {
    refreshDrawerData()
  }, [refreshDrawerData])

  function handleProductTap(product: Product) {
    // If product has modifiers, show the modifier popup
    if (product.modifiers && product.modifiers.length > 0) {
      const defaults: Record<string, string> = {}
      for (const modifier of product.modifiers) {
        if (Array.isArray(modifier?.options) && modifier.options.length > 0) {
          defaults[modifier.name] = modifier.options[0].label
        }
      }
      setModifierProduct(product)
      setModifierSelections(defaults)
      return
    }
    addToCart(product)
  }

  function addToCart(
    product: Product,
    modifiersApplied: Array<{ name: string; option: string; price_delta_cents: number }> = [],
    options?: {
      productProjectionId?: string
      quantity?: number
    }
  ) {
    const hasProjectionOverride = !!(options && 'productProjectionId' in options)
    const productProjectionId = hasProjectionOverride ? options?.productProjectionId : product.id
    const quantityToAdd = Math.max(1, Number(options?.quantity ?? 1))
    const signature = modifierSignature(modifiersApplied)
    const itemId = `${product.id}::${signature}`
    const modifierDelta = modifiersApplied.reduce(
      (sum, modifier) => sum + modifier.price_delta_cents,
      0
    )
    const unitPriceCents = product.price_cents + modifierDelta

    setCart((prev) => {
      const existing = prev.find((item) => item.id === itemId)
      if (existing) {
        return prev.map((item) =>
          item.id === itemId ? { ...item, quantity: item.quantity + quantityToAdd } : item
        )
      }
      return [
        ...prev,
        {
          id: itemId,
          productProjectionId,
          product,
          quantity: quantityToAdd,
          modifiersApplied,
          unitPriceCents,
        },
      ]
    })
  }

  function handleAddWithModifiers() {
    if (!modifierProduct) return

    const modifiersApplied: Array<{ name: string; option: string; price_delta_cents: number }> = []

    for (const modifier of modifierProduct.modifiers ?? []) {
      const selectedOption = modifierSelections[modifier.name]
      if (!selectedOption) continue
      const option = (modifier.options ?? []).find((entry: any) => entry.label === selectedOption)
      if (!option) continue

      modifiersApplied.push({
        name: modifier.name,
        option: option.label,
        price_delta_cents: Number(option.price_delta_cents ?? 0),
      })
    }

    addToCart(modifierProduct, modifiersApplied)
    setModifierProduct(null)
    setModifierSelections({})
  }

  function updateQuantity(itemId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === itemId ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
        )
        .filter((item) => item.quantity > 0)
    )
  }

  function removeFromCart(itemId: string) {
    setCart((prev) => prev.filter((item) => item.id !== itemId))
  }

  function clearCart() {
    setCart([])
    setTipInput('0.00')
    setCashTendered('')
    setSplitCardAmount('')
    setLastSale(null)
    checkoutRequestKeyRef.current = null
    localStorage.removeItem(CART_STORAGE_KEY)
  }

  function handleBarcodeSubmit(rawInput: string) {
    const fallbackParsed = rawInput.trim().match(/^\d{8,14}$/)
      ? {
          code: rawInput.trim(),
          symbology: 'unknown' as const,
        }
      : null
    const parsed = hardware.scanner.parseInput(rawInput) ?? fallbackParsed
    if (!parsed) {
      toast.error('Barcode not recognized')
      return
    }

    const product = runtimeBarcodeProducts[parsed.code] ?? barcodeProductMap.get(parsed.code)
    if (!product) {
      setUnmappedBarcode(parsed.code)
      setUnmappedProductName('')
      setUnmappedProductPrice('')
      setBarcodeInput(parsed.code)
      toast.info(`No product mapped to barcode ${parsed.code}. Create it below.`)
      return
    }

    const isOutOfStock = !!(
      product.track_inventory &&
      product.available_qty !== null &&
      product.available_qty <= 0
    )
    if (isOutOfStock) {
      toast.error(`${product.name} is out of stock`)
      return
    }

    handleProductTap(product)
    setUnmappedBarcode(null)
    setBarcodeInput('')
    toast.success(`${product.name} added`)
  }

  function handleCreateUnmappedBarcodeProduct() {
    const barcode = unmappedBarcode?.trim() ?? ''
    const name = unmappedProductName.trim()
    const priceCents = parseCurrencyToCents(unmappedProductPrice || '0')

    if (!barcode) {
      toast.error('Scan a barcode first')
      return
    }
    if (!name) {
      toast.error('Product name is required')
      return
    }
    if (priceCents <= 0) {
      toast.error('Enter a valid price')
      return
    }

    startTransition(async () => {
      try {
        const created = await createQuickBarcodeProduct({
          barcode,
          name,
          priceCents,
          category: categoryFilter ?? undefined,
          taxClass: 'standard',
        })

        const product: Product = {
          id: String(created.product.id),
          name: String(created.product.name),
          barcode: String(created.product.barcode ?? barcode),
          price_cents: Number(created.product.price_cents ?? priceCents),
          category: (created.product.category as string | null) ?? null,
          image_url: (created.product.image_url as string | null) ?? null,
          is_active: created.product.is_active !== false,
          modifiers: Array.isArray(created.product.modifiers) ? created.product.modifiers : [],
          tax_class: String(created.product.tax_class ?? 'standard'),
          cost_cents:
            typeof created.product.cost_cents === 'number' ? created.product.cost_cents : null,
          track_inventory: created.product.track_inventory ?? false,
          available_qty:
            typeof created.product.available_qty === 'number'
              ? created.product.available_qty
              : null,
          low_stock_threshold:
            typeof created.product.low_stock_threshold === 'number'
              ? created.product.low_stock_threshold
              : null,
        }

        setRuntimeBarcodeProducts((prev) => ({
          ...prev,
          [barcode]: product,
        }))

        handleProductTap(product)
        setUnmappedBarcode(null)
        setUnmappedProductName('')
        setUnmappedProductPrice('')
        setBarcodeInput('')
        toast.success(
          created.created
            ? `${product.name} created and added to cart`
            : `${product.name} already existed and was added`
        )
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to create barcode product')
      }
    })
  }

  function resetQuickSandwichState() {
    setShowQuickSandwich(false)
    setQuickRecipeSearch('')
    setQuickRecipeId('')
    setQuickSellPrice('')
    setQuickPricePreset(null)
  }

  function resetQuickItemState() {
    setShowQuickItem(false)
    setQuickItemName('')
    setQuickItemPrice('')
    setQuickItemQty('1')
    setQuickItemTaxClass('prepared_food')
  }

  function handleAddQuickItem() {
    const name = quickItemName.trim()
    const priceCents = parseCurrencyToCents(quickItemPrice || '0')
    const quantity = Number.parseInt(quickItemQty, 10)

    if (!name) {
      toast.error('Item name is required')
      return
    }
    if (priceCents <= 0) {
      toast.error('Enter a valid item price')
      return
    }
    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 50) {
      toast.error('Quantity must be between 1 and 50')
      return
    }

    const customProduct: Product = {
      id: buildQuickItemId(name, priceCents, quickItemTaxClass),
      name,
      barcode: null,
      price_cents: priceCents,
      category: null,
      image_url: null,
      is_active: true,
      modifiers: [],
      tax_class: quickItemTaxClass,
      cost_cents: null,
      track_inventory: false,
      available_qty: null,
      low_stock_threshold: null,
    }

    addToCart(customProduct, [], {
      productProjectionId: undefined,
      quantity,
    })
    resetQuickItemState()
    toast.success(`${name} added to cart`)
  }

  function applyQuickPricePreset(preset: QuickPricePresetId) {
    if (!quickRecipe || !quickRecipe.totalCostCents || quickRecipe.totalCostCents <= 0) {
      toast.error('Food cost not available for this recipe')
      return
    }

    const priceCents = getPresetSellPriceCents(quickRecipe.totalCostCents, preset)
    setQuickSellPrice((priceCents / 100).toFixed(2))
    setQuickPricePreset(preset)
  }

  function handleAddQuickSandwich() {
    if (!quickRecipe) {
      toast.error('Select a recipe first')
      return
    }
    const priceCents = parseCurrencyToCents(quickSellPrice || '0')
    if (priceCents <= 0) {
      toast.error('Enter a valid sale price')
      return
    }

    startTransition(async () => {
      try {
        const created = await snapshotProductFromRecipe({
          recipeId: quickRecipe.id,
          priceCents,
          category: quickRecipe.category ?? undefined,
        })

        addToCart({
          id: created.id,
          name: quickRecipe.name,
          barcode: null,
          price_cents: priceCents,
          category: quickRecipe.category,
          image_url: null,
          is_active: true,
          modifiers: [],
          tax_class: 'standard',
          cost_cents: quickRecipe.totalCostCents,
          track_inventory: false,
          available_qty: null,
          low_stock_threshold: null,
        })

        resetQuickSandwichState()
        toast.success(`${quickRecipe.name} added to cart`)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to add recipe item')
      }
    })
  }

  function downloadReceiptPdf(saleId: string) {
    startTransition(async () => {
      try {
        const { pdf, filename } = await generateReceipt(saleId)
        const binary = atob(pdf)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
        const blob = new Blob([bytes], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        link.click()
        URL.revokeObjectURL(url)
      } catch {
        toast.error('Failed to download receipt')
      }
    })
  }

  const loadReceiptTargets = useCallback(async (saleId: string) => {
    setIsLoadingReceiptTargets(true)
    try {
      const targets = await getReceiptDeliveryTargets(saleId)
      setReceiptEmail(targets.suggestedEmail ?? '')
      setReceiptPhone(targets.suggestedPhone ?? '')
    } catch {
      setReceiptEmail('')
      setReceiptPhone('')
    } finally {
      setIsLoadingReceiptTargets(false)
    }
  }, [])

  async function handleSendReceiptEmail() {
    if (!lastSale?.saleId) return
    if (!receiptEmail.trim()) {
      toast.error('Enter an email address')
      return
    }

    setIsSendingReceiptEmail(true)
    try {
      const result = await sendReceiptByEmail({
        saleId: lastSale.saleId,
        toEmail: receiptEmail.trim(),
      })
      toast.success(`Receipt emailed to ${result.toEmail}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send receipt email')
    } finally {
      setIsSendingReceiptEmail(false)
    }
  }

  async function handleSendReceiptSms() {
    if (!lastSale?.saleId) return
    if (!receiptPhone.trim()) {
      toast.error('Enter a phone number')
      return
    }

    setIsSendingReceiptSms(true)
    try {
      const result = await sendReceiptBySms({
        saleId: lastSale.saleId,
        toPhone: receiptPhone.trim(),
      })
      if (result.status === 'sent') {
        toast.success(`Receipt SMS sent to ${result.toPhone}`)
      } else if (result.status === 'not_configured') {
        toast.warning('SMS service is not configured')
      } else {
        toast.error('SMS delivery failed')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send receipt SMS')
    } finally {
      setIsSendingReceiptSms(false)
    }
  }

  const enqueueReceiptPrintJob = useCallback(
    async (input: { saleId: string; saleNumber: string; totalCents: number }) => {
      if (!hardware.capabilities.printerEnabled) return

      const job = async () => {
        setPendingPrintJobs((count) => count + 1)
        try {
          const maxAttempts = 3
          for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const result = await hardware.printer.print({
              saleId: input.saleId,
              content: JSON.stringify({
                saleId: input.saleId,
                saleNumber: input.saleNumber,
                totalCents: input.totalCents,
                printedAt: new Date().toISOString(),
              }),
            })
            if (result.success) return
            if (attempt < maxAttempts) {
              const backoffMs = 300 * attempt
              await new Promise((resolve) => setTimeout(resolve, backoffMs))
            }
          }
          toast.warning('Receipt printer failed after retries; use manual receipt download')
        } finally {
          setPendingPrintJobs((count) => Math.max(0, count - 1))
        }
      }

      printQueueRef.current = printQueueRef.current.then(job, job)
      await printQueueRef.current
    },
    [hardware]
  )

  const runPostCheckoutHardware = useCallback(
    async (input: {
      saleId: string
      saleNumber: string
      totalCents: number
      paymentMethod: 'cash' | 'card' | 'split'
      openCashDrawer?: boolean
    }) => {
      const jobs: Promise<void>[] = []

      if (hardware.capabilities.printerEnabled) {
        jobs.push(
          enqueueReceiptPrintJob({
            saleId: input.saleId,
            saleNumber: input.saleNumber,
            totalCents: input.totalCents,
          })
        )
      }

      const shouldOpenCashDrawer =
        hardware.capabilities.cashDrawerEnabled &&
        (input.paymentMethod === 'cash' || input.openCashDrawer === true)
      if (shouldOpenCashDrawer) {
        jobs.push(
          (async () => {
            const result = await hardware.cashDrawer.open({
              reason: 'cash_sale_completed',
              registerSessionId: registerSession?.id,
            })
            if (!result.success) {
              toast.warning('Cash drawer did not open automatically')
            }
          })()
        )
      }

      await Promise.allSettled(jobs)
    },
    [hardware, registerSession?.id, enqueueReceiptPrintJob]
  )

  function handleCheckout(paymentMethod: 'cash' | 'card' | 'split') {
    if (cart.length === 0) return
    if (isCheckoutSubmitting) {
      toast.info('Checkout already in progress')
      return
    }
    if (!isRegisterOpen || !registerSession?.id) {
      toast.error('Open register is required before checkout')
      return
    }
    if (
      (paymentMethod === 'card' || paymentMethod === 'split') &&
      terminalHealth &&
      !terminalHealth.healthy
    ) {
      toast.error(`Card terminal unavailable: ${terminalHealth.message}`)
      return
    }
    if (taxBlockingMessage) {
      toast.error(taxBlockingMessage)
      return
    }
    if (cartHasAgeRestrictedItems && !ageVerified) {
      toast.error('Age verification is required for restricted items')
      return
    }

    let checkoutPaymentMethod: 'cash' | 'card' = paymentMethod === 'cash' ? 'cash' : 'card'
    let amountTenderedCents = paymentMethod === 'cash' ? cashTenderedCents : totalDueCents
    let splitTenders:
      | Array<{
          paymentMethod: 'cash' | 'card'
          amountCents: number
          amountTenderedCents?: number
        }>
      | undefined
    let openCashDrawerAfterCheckout = paymentMethod === 'cash'

    if (paymentMethod === 'cash' && amountTenderedCents < totalDueCents) {
      toast.error('Amount tendered must be at least the total due')
      return
    }

    if (paymentMethod === 'split') {
      if (splitCardAmountCents <= 0 || splitCardAmountCents >= totalDueCents) {
        toast.error('Split card amount must be greater than $0 and less than total due')
        return
      }
      if (cashTenderedCents < splitCashPortionCents) {
        toast.error('Cash tendered must cover the split cash portion')
        return
      }

      checkoutPaymentMethod = 'card'
      amountTenderedCents = splitCardAmountCents + cashTenderedCents
      splitTenders = [
        {
          paymentMethod: 'card',
          amountCents: splitCardAmountCents,
        },
        {
          paymentMethod: 'cash',
          amountCents: splitCashPortionCents,
          amountTenderedCents: cashTenderedCents,
        },
      ]
      openCashDrawerAfterCheckout = true
    }

    if (!checkoutRequestKeyRef.current) {
      checkoutRequestKeyRef.current = buildCheckoutAttemptKey()
    }
    setIsCheckoutSubmitting(true)

    startTransition(async () => {
      try {
        const checkoutNotes = selectedDiningCheck
          ? `[dining_check:${selectedDiningCheck.id}] table=${selectedDiningCheck.tableLabel}`
          : undefined

        const result = await counterCheckout({
          registerSessionId: registerSession.id,
          items: cart.map((item) => ({
            productProjectionId: item.productProjectionId,
            name: item.product.name,
            unitPriceCents: item.product.price_cents,
            quantity: item.quantity,
            taxClass: (item.product.tax_class as any) ?? 'standard',
            modifiersApplied: item.modifiersApplied,
            unitCostCents: item.product.cost_cents ?? undefined,
          })),
          paymentMethod: checkoutPaymentMethod,
          amountTenderedCents,
          splitTenders,
          tipCents,
          ageVerified,
          promotionCode: promotionCode.trim() || undefined,
          idempotencyKey: checkoutRequestKeyRef.current ?? undefined,
          taxZipCode: defaultTaxZip,
          notes: checkoutNotes,
        })

        setLastSale({
          saleId: result.saleId,
          saleNumber: result.saleNumber,
          totalCents: result.totalCents,
          changeDueCents: result.changeDueCents,
        })
        void loadReceiptTargets(result.saleId)
        setRecentTransactionRows((prev) =>
          [
            {
              saleId: result.saleId,
              saleNumber: result.saleNumber,
              status: 'captured',
              totalCents: result.totalCents,
              createdAt: new Date().toISOString(),
              paymentMethod,
              paymentStatus: 'captured',
            },
            ...prev.filter((row) => row.saleId !== result.saleId),
          ].slice(0, 20)
        )
        if (result.appliedPromotion) {
          toast.success(
            `Sale ${result.saleNumber} completed (${result.appliedPromotion.code} -${formatCurrency(result.appliedPromotion.discountCents)})`
          )
        } else {
          toast.success(`Sale ${result.saleNumber} completed`)
        }

        // Create order queue entry (non-blocking)
        try {
          await createOrderQueueEntry({ saleId: result.saleId })
        } catch {
          // Non-blocking - order queue is optional
        }

        if (selectedDiningCheck) {
          try {
            await closeDiningCheck({
              checkId: selectedDiningCheck.id,
              saleId: result.saleId,
              notes: `Auto-closed by checkout ${result.saleNumber}`,
            })
          } catch (error) {
            toast.warning(
              error instanceof Error
                ? `Sale captured but dining check close failed: ${error.message}`
                : 'Sale captured but dining check close failed'
            )
          }
        }

        void runPostCheckoutHardware({
          saleId: result.saleId,
          saleNumber: result.saleNumber,
          totalCents: result.totalCents,
          paymentMethod,
          openCashDrawer: openCashDrawerAfterCheckout,
        })

        setCart([])
        setTipInput('0.00')
        setCashTendered('')
        setSplitCardAmount('')
        setAgeVerified(false)
        setSelectedDiningCheckId('')
        checkoutRequestKeyRef.current = null
        localStorage.removeItem(CART_STORAGE_KEY)
        await refreshDrawerData()
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Checkout failed')
      } finally {
        setIsCheckoutSubmitting(false)
      }
    })
  }

  function handleOpenRegister() {
    const cents = parseCurrencyToCents(openingCash || '0')
    startTransition(async () => {
      try {
        await openRegister({ openingCashCents: cents })
        setShowOpenRegister(false)
        setOpeningCash('')
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to open register')
      }
    })
  }

  function handleCloseRegister() {
    if (!registerSession) return
    const cents = parseCurrencyToCents(closingCash || '0')
    const normalizedCloseNotes = closingNotes.trim()

    if (
      drawerSummary &&
      Math.abs(cents - drawerSummary.expectedCashCents) > closeVarianceReasonThresholdCents &&
      !normalizedCloseNotes
    ) {
      toast.error(
        `Close notes are required when variance exceeds ${formatCurrency(closeVarianceReasonThresholdCents)}`
      )
      return
    }

    startTransition(async () => {
      try {
        await closeRegister(registerSession.id, cents, normalizedCloseNotes || undefined)
        setShowCloseRegister(false)
        setClosingCash('')
        setClosingNotes('')
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to close register')
      }
    })
  }

  function handleResumeRegister() {
    if (!registerSession?.id) return
    startTransition(async () => {
      try {
        await resumeRegister(registerSession.id)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to resume register')
      }
    })
  }

  function handleSuspendRegister() {
    if (!registerSession?.id) return
    startTransition(async () => {
      try {
        await suspendRegister(registerSession.id, suspendNotes || undefined)
        setShowSuspendRegister(false)
        setSuspendNotes('')
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to suspend register')
      }
    })
  }

  function handleDrawerActionSubmit() {
    if (!registerSession?.id || !drawerAction || !isRegisterOpen) return
    const amountCents = parseCurrencyToCents(drawerAmount || '0')

    if (drawerAction !== 'adjustment' && drawerAction !== 'no_sale' && amountCents <= 0) {
      toast.error('Enter a positive amount')
      return
    }

    if (drawerAction === 'no_sale' && !drawerNotes.trim()) {
      toast.error('Notes are required for no-sale drawer open')
      return
    }

    startTransition(async () => {
      try {
        if (drawerAction === 'paid_in') {
          await recordCashPaidIn({
            registerSessionId: registerSession.id,
            amountCents,
            notes: drawerNotes || undefined,
          })
        } else if (drawerAction === 'paid_out') {
          await recordCashPaidOut({
            registerSessionId: registerSession.id,
            amountCents,
            notes: drawerNotes || undefined,
          })
        } else if (drawerAction === 'no_sale') {
          await recordCashNoSaleOpen({
            registerSessionId: registerSession.id,
            notes: drawerNotes.trim(),
          })
          if (hardware.capabilities.cashDrawerEnabled) {
            const result = await hardware.cashDrawer.open({
              reason: 'no_sale_manual',
              registerSessionId: registerSession.id,
            })
            if (!result.success) {
              toast.warning('Cash drawer did not open automatically')
            }
          }
        } else {
          await recordCashAdjustment({
            registerSessionId: registerSession.id,
            amountCents,
            notes: drawerNotes || undefined,
          })
        }

        setDrawerAction(null)
        setDrawerAmount('')
        setDrawerNotes('')
        await refreshDrawerData()
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to record drawer movement')
      }
    })
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-stone-500">Terminal</p>
              <p className="text-sm text-stone-200">
                {terminalHealth?.provider ?? 'not_configured'} -{' '}
                <span className={terminalHealth?.healthy ? 'text-emerald-400' : 'text-amber-400'}>
                  {terminalHealth?.healthy ? 'healthy' : 'degraded'}
                </span>
              </p>
              <p className="text-xs text-stone-500">
                {terminalHealth?.message ?? 'Not configured'}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-stone-500">Hardware</p>
              <p className="text-sm text-stone-200">
                Scanner {hardwareCapabilities?.scannerEnabled ? 'on' : 'off'} - Printer{' '}
                {hardwareCapabilities?.printerEnabled ? 'on' : 'off'} - Drawer{' '}
                {hardwareCapabilities?.cashDrawerEnabled ? 'on' : 'off'}
              </p>
              <p className="text-xs text-stone-500">
                Hardware abstraction active. Disabled devices fail safely without blocking checkout.
              </p>
              {pendingPrintJobs > 0 && (
                <p className="text-xs text-amber-400">
                  Print queue: {pendingPrintJobs} job{pendingPrintJobs === 1 ? '' : 's'} pending
                </p>
              )}
              {managerApprovalRequired && (
                <p className="text-xs text-amber-400">
                  Manager approval is enforced for refunds, voids, paid out/adjustment/no-sale, and
                  register close.
                </p>
              )}
              {roleMatrixRequired && (
                <p className="text-xs text-amber-400">
                  Role matrix is active: cashier+ required for checkout, lead+ for
                  opening/suspending register and paid-in entries, manager for void/refund/close.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-stone-100">POS Register</h1>
        <div className="flex gap-2">
          {!registerSession ? (
            <Button variant="primary" onClick={() => setShowOpenRegister(true)}>
              Open Register
            </Button>
          ) : (
            <>
              <Badge variant={isRegisterOpen ? 'success' : 'warning'}>
                {isRegisterOpen ? 'Register Open' : 'Register Suspended'}
              </Badge>
              {!isRegisterOpen && (
                <Button variant="primary" onClick={handleResumeRegister} disabled={isPending}>
                  Resume Register
                </Button>
              )}
              {isRegisterOpen && (
                <Button
                  variant="ghost"
                  onClick={() => setShowSuspendRegister(true)}
                  disabled={isPending}
                >
                  Suspend Register
                </Button>
              )}
              <Button variant="secondary" onClick={() => setShowCloseRegister(true)}>
                Close Register
              </Button>
            </>
          )}
        </div>
      </div>

      {registerSession && drawerSummary && (
        <Card>
          <CardContent className="p-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-stone-500">Expected Drawer</p>
                <p className="text-2xl font-bold text-emerald-400">
                  {formatCurrency(drawerSummary.expectedCashCents)}
                </p>
                <p className="text-xs text-stone-500">
                  Opening {formatCurrency(drawerSummary.openingCashCents)} - Net{' '}
                  {formatCurrency(drawerSummary.movementNetCents)}
                </p>
              </div>
              <div className="text-sm text-stone-400">
                <p>Sales: {formatCurrency(drawerSummary.breakdown.salePaymentCents)}</p>
                <p>Refunds: {formatCurrency(drawerSummary.breakdown.refundCents)}</p>
                <p>Paid In: {formatCurrency(drawerSummary.breakdown.paidInCents)}</p>
                <p>Paid Out: {formatCurrency(drawerSummary.breakdown.paidOutCents)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setDrawerAction('paid_in')}
                  disabled={!isRegisterOpen}
                >
                  <Wallet className="mr-2 h-4 w-4" />
                  Paid In
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setDrawerAction('paid_out')}
                  disabled={!isRegisterOpen}
                >
                  <Wallet className="mr-2 h-4 w-4" />
                  Paid Out
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setDrawerAction('adjustment')}
                  disabled={!isRegisterOpen}
                >
                  Adjustment
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setDrawerAction('no_sale')}
                  disabled={!isRegisterOpen}
                >
                  No Sale
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {drawerAction && registerSession && isRegisterOpen && (
        <Card>
          <CardContent className="p-4">
            <h3 className="mb-3 text-stone-200 font-medium capitalize">
              Record {drawerAction.replace('_', ' ')}
            </h3>
            <div className="grid gap-3 md:grid-cols-3">
              {drawerAction !== 'no_sale' && (
                <div>
                  <label className="text-stone-400 text-sm">Amount ($)</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={drawerAmount}
                    onChange={(e) => setDrawerAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              )}
              <div className={drawerAction === 'no_sale' ? 'md:col-span-3' : 'md:col-span-2'}>
                <label className="text-stone-400 text-sm">
                  {drawerAction === 'no_sale' ? 'Notes (required)' : 'Notes (optional)'}
                </label>
                <Input
                  value={drawerNotes}
                  onChange={(e) => setDrawerNotes(e.target.value)}
                  placeholder={
                    drawerAction === 'no_sale'
                      ? 'Required reason for no-sale open'
                      : 'Reason for movement'
                  }
                />
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button variant="primary" disabled={isPending} onClick={handleDrawerActionSubmit}>
                Save
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setDrawerAction(null)
                  setDrawerAmount('')
                  setDrawerNotes('')
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {showOpenRegister && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-stone-200 font-medium mb-3">Open Register</h3>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="text-stone-400 text-sm">Opening Cash ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <Button variant="primary" onClick={handleOpenRegister} disabled={isPending}>
                Open
              </Button>
              <Button variant="ghost" onClick={() => setShowOpenRegister(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {showCloseRegister && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-stone-200 font-medium mb-3">Close Register</h3>
            <div className="grid gap-3">
              <div className="rounded-md border border-stone-700 bg-stone-900 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-stone-500">Expected Drawer</p>
                <p className="text-sm font-medium text-stone-100">
                  {formatCurrency(expectedClosingCashCents)}
                </p>
                {closingCash.trim() && (
                  <p
                    className={`text-xs ${
                      closingVarianceCents === 0
                        ? 'text-emerald-400'
                        : closingVarianceCents > 0
                          ? 'text-amber-400'
                          : 'text-red-400'
                    }`}
                  >
                    Variance: {formatCurrency(closingVarianceCents)}
                  </p>
                )}
              </div>
              <div>
                <label className="text-stone-400 text-sm">Closing Cash ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={closingCash}
                  onChange={(e) => setClosingCash(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-stone-400 text-sm">
                  Close Notes (required for large variance)
                </label>
                <Input
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  placeholder="Count summary or variance reason"
                />
                {closingVarianceNeedsReason && (
                  <p className="mt-1 text-xs text-amber-400">
                    Notes are required because variance exceeds{' '}
                    {formatCurrency(closeVarianceReasonThresholdCents)}.
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="primary" onClick={handleCloseRegister} disabled={isPending}>
                  Close
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowCloseRegister(false)
                    setClosingCash('')
                    setClosingNotes('')
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {showSuspendRegister && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-stone-200 font-medium mb-3">Suspend Register</h3>
            <div className="grid gap-3">
              <div>
                <label className="text-stone-400 text-sm">Suspend Notes (optional)</label>
                <Input
                  value={suspendNotes}
                  onChange={(e) => setSuspendNotes(e.target.value)}
                  placeholder="Shift handoff note or reason"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="primary" onClick={handleSuspendRegister} disabled={isPending}>
                  Suspend
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowSuspendRegister(false)
                    setSuspendNotes('')
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {lastSale && (
        <Card>
          <CardContent className="p-4 bg-emerald-900/20 border border-emerald-800 rounded-lg space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-emerald-400 font-medium">Sale {lastSale.saleNumber} completed</p>
                <p className="text-stone-400 text-sm">
                  Total: {formatCurrency(lastSale.totalCents)}
                  {lastSale.changeDueCents > 0
                    ? ` - Change due: ${formatCurrency(lastSale.changeDueCents)}`
                    : ''}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  onClick={() => downloadReceiptPdf(lastSale.saleId)}
                  disabled={isPending}
                >
                  <Download className="w-4 h-4 mr-1" />
                  Receipt
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setLastSale(null)
                    setReceiptEmail('')
                    setReceiptPhone('')
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-[1fr_auto_1fr_auto]">
              <Input
                type="email"
                value={receiptEmail}
                onChange={(e) => setReceiptEmail(e.target.value)}
                placeholder="Receipt email"
                disabled={isLoadingReceiptTargets}
              />
              <Button
                variant="secondary"
                onClick={handleSendReceiptEmail}
                disabled={isSendingReceiptEmail || isLoadingReceiptTargets}
              >
                {isSendingReceiptEmail ? 'Sending...' : 'Send Email'}
              </Button>
              <Input
                value={receiptPhone}
                onChange={(e) => setReceiptPhone(e.target.value)}
                placeholder="Receipt SMS number"
                disabled={isLoadingReceiptTargets}
              />
              <Button
                variant="secondary"
                onClick={handleSendReceiptSms}
                disabled={isSendingReceiptSms || isLoadingReceiptTargets}
              >
                {isSendingReceiptSms ? 'Sending...' : 'Send SMS'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {recentTransactionRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              type="search"
              placeholder="Find by sale # or amount..."
              value={recentTransactionSearch}
              onChange={(e) => setRecentTransactionSearch(e.target.value)}
            />
            {filteredRecentTransactions.length === 0 ? (
              <p className="text-sm text-stone-500">No transactions match this search.</p>
            ) : (
              <div className="space-y-2">
                {filteredRecentTransactions.map((row) => (
                  <div
                    key={row.saleId}
                    className="flex flex-col gap-2 rounded-md border border-stone-800 bg-stone-900 px-3 py-2 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-stone-100">{row.saleNumber}</p>
                      <p className="text-xs text-stone-500">
                        {formatTransactionTime(row.createdAt)} -{' '}
                        {row.paymentMethod ? row.paymentMethod.toUpperCase() : 'UNKNOWN'} -{' '}
                        {row.paymentStatus ?? row.status}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-stone-100">
                        {formatCurrency(row.totalCents)}
                      </p>
                      <Button
                        variant="ghost"
                        onClick={() => downloadReceiptPdf(row.saleId)}
                        disabled={isPending}
                      >
                        Receipt
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => router.push(`/commerce/sales/${row.saleId}`)}
                      >
                        Open
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
              <Input
                type="search"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="primary"
              type="button"
              onClick={() => setShowQuickSandwich(true)}
              disabled={recipeOptions.length === 0}
            >
              Add Sandwich
            </Button>
            <Button variant="secondary" type="button" onClick={() => setShowQuickItem(true)}>
              Quick Item
            </Button>
            {hardware.capabilities.scannerEnabled && (
              <>
                <div className="w-56 relative">
                  <ScanLine className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="Scan barcode"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleBarcodeSubmit(barcodeInput)
                      }
                    }}
                    className="pl-10"
                  />
                </div>
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => handleBarcodeSubmit(barcodeInput)}
                  disabled={!barcodeInput.trim()}
                >
                  Add
                </Button>
              </>
            )}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {unmappedBarcode && (
              <div className="w-full rounded-xl border border-amber-700/40 bg-amber-950/20 p-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-end">
                  <div className="md:w-56">
                    <p className="text-xs text-amber-300/80">Unknown barcode</p>
                    <p className="text-sm font-semibold text-amber-100">{unmappedBarcode}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-stone-400 mb-1">Product name</p>
                    <Input
                      type="text"
                      placeholder="e.g. Coke 20oz"
                      value={unmappedProductName}
                      onChange={(e) => setUnmappedProductName(e.target.value)}
                    />
                  </div>
                  <div className="w-full md:w-40">
                    <p className="text-xs text-stone-400 mb-1">Price</p>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={unmappedProductPrice}
                      onChange={(e) => setUnmappedProductPrice(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      type="button"
                      onClick={handleCreateUnmappedBarcodeProduct}
                      disabled={isPending}
                    >
                      Create + Add
                    </Button>
                    <Button
                      variant="ghost"
                      type="button"
                      onClick={() => {
                        setUnmappedBarcode(null)
                        setUnmappedProductName('')
                        setUnmappedProductPrice('')
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setCategoryFilter(null)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                categoryFilter === null
                  ? 'bg-brand-600 text-white'
                  : 'bg-stone-800 text-stone-400 hover:text-stone-200'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat === categoryFilter ? null : cat)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  categoryFilter === cat
                    ? 'bg-brand-600 text-white'
                    : 'bg-stone-800 text-stone-400 hover:text-stone-200'
                }`}
              >
                {PRODUCT_CATEGORY_LABELS[cat as ProductCategory] ?? cat}
              </button>
            ))}
          </div>

          {filteredProducts.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-stone-500">No products found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredProducts.map((product: Product) => {
                const isLowStock =
                  product.track_inventory &&
                  product.available_qty !== null &&
                  product.low_stock_threshold !== null &&
                  product.available_qty <= product.low_stock_threshold
                const isOutOfStock = !!(
                  product.track_inventory &&
                  product.available_qty !== null &&
                  product.available_qty <= 0
                )

                return (
                  <button
                    key={product.id}
                    onClick={() => handleProductTap(product)}
                    disabled={isOutOfStock}
                    className={`bg-stone-900 border border-stone-800 rounded-lg text-left transition-all active:scale-95 overflow-hidden ${
                      isOutOfStock
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:border-brand-600 hover:bg-stone-800'
                    }`}
                  >
                    {product.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="h-24 w-full object-cover"
                        loading="lazy"
                      />
                    ) : null}
                    <div className="p-3">
                      <p className="text-stone-200 font-medium text-sm line-clamp-2">
                        {product.name}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-brand-500 font-bold">
                          {formatCurrency(product.price_cents)}
                        </p>
                        {product.track_inventory && product.available_qty !== null && (
                          <span
                            className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                              isOutOfStock
                                ? 'bg-red-500/20 text-red-400'
                                : isLowStock
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : 'bg-stone-800 text-stone-400'
                            }`}
                          >
                            {isOutOfStock ? 'Out' : product.available_qty}
                          </span>
                        )}
                      </div>
                      {product.category && (
                        <p className="text-stone-500 text-xs mt-1">
                          {PRODUCT_CATEGORY_LABELS[product.category as ProductCategory] ??
                            product.category}
                        </p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Cart ({cart.reduce((sum, i) => sum + i.quantity, 0)})
                </CardTitle>
                {cart.length > 0 && (
                  <Button variant="ghost" onClick={clearCart}>
                    Clear
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {cart.length === 0 ? (
                <p className="text-stone-500 text-sm text-center py-8">Tap products to add them</p>
              ) : (
                <>
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 py-2 border-b border-stone-800 last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-stone-200 text-sm truncate">
                          {item.product.name}
                          {!item.productProjectionId && (
                            <span className="ml-2 rounded bg-stone-800 px-1.5 py-0.5 text-xxs uppercase tracking-wide text-stone-400">
                              Quick
                            </span>
                          )}
                        </p>
                        <p className="text-stone-500 text-xs">
                          {formatCurrency(item.unitPriceCents)} each
                        </p>
                        {item.modifiersApplied.length > 0 && (
                          <p className="text-stone-500 text-xs">
                            {item.modifiersApplied
                              .map((modifier) => `${modifier.name}: ${modifier.option}`)
                              .join(' - ')}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-7 h-7 flex items-center justify-center rounded bg-stone-800 hover:bg-stone-700 text-stone-300"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-stone-200 text-sm w-6 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-7 h-7 flex items-center justify-center rounded bg-stone-800 hover:bg-stone-700 text-stone-300"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="text-stone-200 text-sm font-medium w-16 text-right">
                        {formatCurrency(item.unitPriceCents * item.quantity)}
                      </span>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-stone-500 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  <div className="space-y-2 pt-3 border-t border-stone-700">
                    <div className="flex justify-between text-stone-400 text-sm">
                      <span>Subtotal</span>
                      <span>{formatCurrency(subtotalCents)}</span>
                    </div>
                    <div className="flex justify-between text-stone-400 text-sm">
                      <span>Estimated Tax</span>
                      <span>{formatCurrency(estimatedTaxCents)}</span>
                    </div>
                    <div>
                      <label className="text-stone-400 text-xs">Tip ($)</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={tipInput}
                        onChange={(e) => setTipInput(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="text-stone-400 text-xs">Cash Tendered ($)</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={cashTendered}
                        onChange={(e) => setCashTendered(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-stone-400 text-xs">Split Card Amount ($)</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={splitCardAmount}
                        onChange={(e) => setSplitCardAmount(e.target.value)}
                        placeholder="Optional for card + cash split"
                      />
                      {isSplitConfigurationActive && (
                        <p
                          className={`mt-1 text-xs ${
                            isSplitAmountInvalid ? 'text-amber-400' : 'text-stone-500'
                          }`}
                        >
                          {isSplitAmountInvalid
                            ? 'Split card amount must be greater than $0 and less than the total.'
                            : `Split cash portion: ${formatCurrency(splitCashPortionCents)}`}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-stone-400 text-xs">Promotion Code</label>
                      <Input
                        value={promotionCode}
                        onChange={(e) => setPromotionCode(e.target.value.toUpperCase())}
                        placeholder="Optional promo code"
                        list="pos-promotion-codes"
                      />
                      <datalist id="pos-promotion-codes">
                        {activePromotions.map((promotion) => (
                          <option key={promotion.code} value={promotion.code}>
                            {promotion.name}
                          </option>
                        ))}
                      </datalist>
                      {promotionHint && (
                        <p className="text-xs text-stone-500 mt-1">
                          {promotionHint.name}
                          {promotionHint.autoApply ? ' (auto apply eligible)' : ''}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-stone-400 text-xs">Open Table Check</label>
                      <select
                        value={selectedDiningCheckId}
                        onChange={(e) => setSelectedDiningCheckId(e.target.value)}
                        className="w-full rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200"
                      >
                        <option value="">Walk-in / no table tab</option>
                        {openDiningChecks.map((check) => (
                          <option key={check.id} value={check.id}>
                            {check.tableLabel}
                            {check.guestName ? ` - ${check.guestName}` : ''}
                          </option>
                        ))}
                      </select>
                      {selectedDiningCheck && (
                        <p className="text-xs text-stone-500 mt-1">
                          Will auto-close {selectedDiningCheck.tableLabel} check on payment.
                        </p>
                      )}
                    </div>

                    <div className="flex justify-between text-stone-100 font-bold text-lg">
                      <span>Total</span>
                      <span>{formatCurrency(totalDueCents)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <Button
                      variant="primary"
                      onClick={() => handleCheckout('cash')}
                      disabled={
                        isPending ||
                        isCheckoutSubmitting ||
                        !isRegisterOpen ||
                        !!taxBlockingMessage ||
                        (cartHasAgeRestrictedItems && !ageVerified) ||
                        insufficientCashTendered
                      }
                      className="flex items-center justify-center gap-2"
                    >
                      <Banknote className="w-4 h-4" />
                      Cash
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => handleCheckout('split')}
                      disabled={
                        isPending ||
                        isCheckoutSubmitting ||
                        !isRegisterOpen ||
                        !!taxBlockingMessage ||
                        (cartHasAgeRestrictedItems && !ageVerified) ||
                        !!cardTerminalBlockingMessage ||
                        !isSplitConfigurationActive ||
                        isSplitAmountInvalid ||
                        insufficientSplitCashTendered
                      }
                      className="flex items-center justify-center gap-2"
                    >
                      <Wallet className="w-4 h-4" />
                      Split
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => handleCheckout('card')}
                      disabled={
                        isPending ||
                        isCheckoutSubmitting ||
                        !isRegisterOpen ||
                        !!taxBlockingMessage ||
                        (cartHasAgeRestrictedItems && !ageVerified) ||
                        !!cardTerminalBlockingMessage
                      }
                      className="flex items-center justify-center gap-2"
                    >
                      <CreditCard className="w-4 h-4" />
                      Card
                    </Button>
                  </div>
                  {cartHasAgeRestrictedItems && (
                    <label className="mt-2 flex items-center gap-2 text-xs text-stone-300">
                      <input
                        type="checkbox"
                        checked={ageVerified}
                        onChange={(e) => setAgeVerified(e.target.checked)}
                        className="h-4 w-4 rounded border-stone-600 bg-stone-900 text-emerald-500"
                      />
                      Age verified (21+) for restricted items
                    </label>
                  )}
                  {!isRegisterOpen && registerSession && (
                    <p className="text-xs text-amber-400">
                      Register is suspended. Resume it before processing payments.
                    </p>
                  )}
                  {taxBlockingMessage && (
                    <p className="text-xs text-amber-400">{taxBlockingMessage}</p>
                  )}
                  {insufficientCashTendered && !isSplitConfigurationActive && (
                    <p className="text-xs text-amber-400">
                      Cash tendered must be at least the total due.
                    </p>
                  )}
                  {isSplitAmountInvalid && (
                    <p className="text-xs text-amber-400">
                      Split card amount must be between $0.01 and just under the total.
                    </p>
                  )}
                  {insufficientSplitCashTendered && (
                    <p className="text-xs text-amber-400">
                      Cash tendered must cover the split cash portion.
                    </p>
                  )}
                  {cartHasAgeRestrictedItems && !ageVerified && (
                    <p className="text-xs text-amber-400">
                      Confirm age verification before accepting payment.
                    </p>
                  )}
                  {cardTerminalBlockingMessage && (
                    <p className="text-xs text-amber-400">{cardTerminalBlockingMessage}</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {showQuickItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Quick Item</CardTitle>
                <button
                  type="button"
                  title="Close"
                  onClick={resetQuickItemState}
                  className="text-stone-400 hover:text-stone-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-stone-400">
                Add a one-off menu item without barcode or recipe.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-stone-400 text-sm">Item Name</label>
                <Input
                  value={quickItemName}
                  onChange={(e) => setQuickItemName(e.target.value)}
                  placeholder="Turkey Sandwich"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-400 text-sm">Price ($)</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={quickItemPrice}
                    onChange={(e) => setQuickItemPrice(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-stone-400 text-sm">Qty</label>
                  <Input
                    type="number"
                    min="1"
                    max="50"
                    step="1"
                    value={quickItemQty}
                    onChange={(e) => setQuickItemQty(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="text-stone-400 text-sm">Tax Class</label>
                <select
                  value={quickItemTaxClass}
                  onChange={(e) => setQuickItemTaxClass(e.target.value as TaxClass)}
                  className="w-full rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200"
                >
                  {QUICK_ITEM_TAX_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="primary" onClick={handleAddQuickItem}>
                  Add to Cart
                </Button>
                <Button variant="ghost" onClick={resetQuickItemState}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showQuickSandwich && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <Card className="w-full max-w-lg mx-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Add Sandwich</CardTitle>
                <button
                  type="button"
                  title="Close"
                  onClick={resetQuickSandwichState}
                  className="text-stone-400 hover:text-stone-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-stone-400">
                Pick a recipe, set sale price, and add it to this ticket.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {recipeOptions.length === 0 ? (
                <p className="text-sm text-stone-500">
                  No recipes available yet. Create recipes first to use quick sandwich add.
                </p>
              ) : (
                <>
                  <div>
                    <label className="text-stone-400 text-sm">Find Recipe</label>
                    <Input
                      value={quickRecipeSearch}
                      onChange={(e) => setQuickRecipeSearch(e.target.value)}
                      placeholder="Turkey sandwich, club, BLT..."
                    />
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                    {filteredRecipeOptions.length === 0 ? (
                      <p className="text-sm text-stone-500">No recipes match this search.</p>
                    ) : (
                      filteredRecipeOptions.map((recipe) => (
                        <button
                          key={recipe.id}
                          type="button"
                          onClick={() => {
                            setQuickRecipeId(recipe.id)
                            setQuickSellPrice('')
                            setQuickPricePreset(null)
                          }}
                          className={`w-full rounded-md border px-3 py-2 text-left transition-colors ${
                            quickRecipeId === recipe.id
                              ? 'border-brand-500 bg-brand-600/20 text-stone-100'
                              : 'border-stone-700 bg-stone-900 text-stone-300 hover:border-stone-500'
                          }`}
                        >
                          <p className="font-medium">{recipe.name}</p>
                          <p className="text-xs text-stone-500">
                            Cost:{' '}
                            {recipe.totalCostCents != null
                              ? formatCurrency(recipe.totalCostCents)
                              : 'not available'}
                          </p>
                        </button>
                      ))
                    )}
                  </div>

                  {quickRecipe && (
                    <div className="rounded-md border border-stone-700 bg-stone-900 px-3 py-2">
                      <p className="text-sm text-stone-300">
                        Food cost:{' '}
                        <span className="font-medium text-stone-100">
                          {quickRecipe.totalCostCents != null
                            ? formatCurrency(quickRecipe.totalCostCents)
                            : 'unknown'}
                        </span>
                      </p>
                      {quickRecipe.hasAllPrices === false && (
                        <p className="text-xs text-amber-400 mt-1">
                          Recipe costing is incomplete. Verify ingredients prices before finalizing.
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="text-stone-400 text-sm">Quick Price Presets</label>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        disabled={!quickRecipeHasCost}
                        onClick={() => applyQuickPricePreset('x2_5')}
                        className={`rounded-md border px-2 py-2 text-xs font-medium transition-colors ${
                          quickPricePreset === 'x2_5'
                            ? 'border-brand-500 bg-brand-600 text-white'
                            : 'border-stone-700 bg-stone-900 text-stone-300 hover:border-stone-500'
                        } ${!quickRecipeHasCost ? 'cursor-not-allowed opacity-50' : ''}`}
                      >
                        2.5x Cost
                      </button>
                      <button
                        type="button"
                        disabled={!quickRecipeHasCost}
                        onClick={() => applyQuickPricePreset('x3')}
                        className={`rounded-md border px-2 py-2 text-xs font-medium transition-colors ${
                          quickPricePreset === 'x3'
                            ? 'border-brand-500 bg-brand-600 text-white'
                            : 'border-stone-700 bg-stone-900 text-stone-300 hover:border-stone-500'
                        } ${!quickRecipeHasCost ? 'cursor-not-allowed opacity-50' : ''}`}
                      >
                        3x Cost
                      </button>
                      <button
                        type="button"
                        disabled={!quickRecipeHasCost}
                        onClick={() => applyQuickPricePreset('food_cost_35')}
                        className={`rounded-md border px-2 py-2 text-xs font-medium transition-colors ${
                          quickPricePreset === 'food_cost_35'
                            ? 'border-brand-500 bg-brand-600 text-white'
                            : 'border-stone-700 bg-stone-900 text-stone-300 hover:border-stone-500'
                        } ${!quickRecipeHasCost ? 'cursor-not-allowed opacity-50' : ''}`}
                      >
                        35% Food Cost
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-stone-400 text-sm">Sale Price ($)</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={quickSellPrice}
                      onChange={(e) => {
                        setQuickSellPrice(e.target.value)
                        setQuickPricePreset(null)
                      }}
                      placeholder="0.00"
                    />
                    {quickFoodCostPercent != null && (
                      <p className="mt-1 text-xs text-stone-500">
                        Estimated food cost: {quickFoodCostPercent}%
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      onClick={handleAddQuickSandwich}
                      disabled={isPending || !quickRecipeId}
                    >
                      Create and Add
                    </Button>
                    <Button variant="ghost" onClick={resetQuickSandwichState}>
                      Cancel
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modifier selection popup */}
      {modifierProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{modifierProduct.name}</CardTitle>
                <button
                  type="button"
                  title="Close"
                  onClick={() => setModifierProduct(null)}
                  className="text-stone-400 hover:text-stone-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-brand-500 font-bold">
                {formatCurrency(modifierProduct.price_cents)}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {(modifierProduct.modifiers ?? []).map((mod: any, idx: number) => (
                <div key={idx}>
                  <label className="text-stone-300 text-sm font-medium block mb-2">
                    {mod.name}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(mod.options ?? []).map((opt: any) => {
                      const isSelected = modifierSelections[mod.name] === opt.label
                      return (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() =>
                            setModifierSelections((prev) => ({ ...prev, [mod.name]: opt.label }))
                          }
                          className={`px-3 py-2 rounded-md text-sm text-left transition-colors ${
                            isSelected
                              ? 'bg-brand-600 text-white border border-brand-500'
                              : 'bg-stone-800 text-stone-300 border border-stone-700 hover:border-stone-500'
                          }`}
                        >
                          <span>{opt.label}</span>
                          {opt.price_delta_cents !== 0 && (
                            <span className="text-xs ml-1 opacity-70">
                              {opt.price_delta_cents > 0 ? '+' : ''}
                              {formatCurrency(opt.price_delta_cents)}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
              <Button variant="primary" className="w-full" onClick={handleAddWithModifiers}>
                Add to Cart
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {drawerMovements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Drawer Movements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {drawerMovements.slice(0, 8).map((movement) => (
              <div key={movement.id} className="flex justify-between text-sm text-stone-400">
                <span className="capitalize">
                  {String(movement.movement_type).replace('_', ' ')}
                </span>
                <span className={movement.amount_cents >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                  {formatCurrency(movement.amount_cents)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
