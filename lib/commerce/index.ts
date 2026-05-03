// Commerce module - public API

// cash-drawer-actions ('use server')
export {
  getCashDrawerSummary,
  listCashDrawerMovements,
  recordCashPaidIn,
  recordCashPaidOut,
  recordCashAdjustment,
  recordCashNoSaleOpen,
} from './cash-drawer-actions'
export type { CashDrawerMovementType, CashDrawerSummary } from './cash-drawer-actions'

// checkout-actions ('use server')
export { counterCheckout, quickSale } from './checkout-actions'
export type {
  CheckoutItem,
  SplitTenderInput,
  CounterCheckoutInput,
  AppliedCheckoutPromotion,
  CounterCheckoutResult,
} from './checkout-actions'

// checkout-idempotency
export {
  CHECKOUT_IDEMPOTENCY_KEY_MAX,
  buildCheckoutPaymentIdempotencyKey,
} from './checkout-idempotency'

// checkout-item-normalization
export {
  normalizeTaxClass,
  sanitizeManualModifierSelections,
  resolveCatalogModifierSelections,
} from './checkout-item-normalization'
export type {
  CheckoutModifierInput,
  CheckoutModifierSelection,
} from './checkout-item-normalization'

// constants
export {
  SALE_STATUSES,
  SALE_STATUS_LABELS,
  SALE_STATUS_COLORS,
  TERMINAL_SALE_STATUSES,
  SALE_CHANNELS,
  SALE_CHANNEL_LABELS,
  COMMERCE_PAYMENT_STATUSES,
  COMMERCE_PAYMENT_STATUS_LABELS,
  TAX_CLASSES,
  TAX_CLASS_LABELS,
  REFUND_STATUSES,
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
  SCHEDULE_STATUSES,
  REGISTER_SESSION_STATUSES,
  REGISTER_SESSION_STATUS_LABELS,
  REGISTER_SESSION_STATUS_COLORS,
  ORDER_QUEUE_STATUSES,
  ORDER_QUEUE_STATUS_LABELS,
  ORDER_QUEUE_STATUS_COLORS,
} from './constants'
export type {
  SaleStatus,
  SaleChannel,
  CommercePaymentStatus,
  TaxClass,
  RefundStatus,
  ProductCategory,
  ScheduleStatus,
  RegisterSessionStatus,
  OrderQueueStatus,
} from './constants'

// event-bridge-actions ('use server')
export { createSaleFromEvent, getEventSale } from './event-bridge-actions'
export type { EventBridgeResult } from './event-bridge-actions'

// export-actions ('use server')
export {
  exportSalesCsv,
  exportPaymentsCsv,
  exportRefundsCsv,
  exportTaxSummaryCsv,
  exportReconciliationCsv,
  exportShiftSessionsCsv,
} from './export-actions'

// inventory-bridge ('use server')
export {
  previewSaleDeduction,
  executeSaleDeduction,
  reverseSaleDeduction,
  deductProductStock,
  reverseProductStock,
} from './inventory-bridge'
export type { SaleDeductionPreviewItem, SaleDeductionPreview } from './inventory-bridge'

// kiosk-policy
export {
  parseRoleCsv,
  readPosManagerRoleSetFromEnv,
  isPosManagerRole,
  getTaxClassRateMultiplier,
  computeLineTaxCents,
} from './kiosk-policy'

// mutation-reason
export {
  MANUAL_REASON_MIN_LENGTH,
  MANUAL_REASON_MAX_LENGTH,
  normalizeManualReason,
} from './mutation-reason'

// observability-actions ('use server')
export {
  recordPosAlert,
  listPosAlerts,
  acknowledgePosAlert,
  resolvePosAlert,
  captureDailyPosMetrics,
  listPosMetricSnapshots,
} from './observability-actions'
export type {
  RecordPosAlertInput,
  PosAlertRow,
  PosMetricSnapshotRow,
} from './observability-actions'

// observability-core
export {
  POS_ALERT_SEVERITIES,
  POS_ALERT_STATUSES,
  normalizePosAlertSeverity,
  normalizePosAlertStatus,
  computePosDailyMetricSnapshot,
} from './observability-core'
export type {
  PosAlertSeverity,
  PosAlertStatus,
  PosDailyMetricInput,
  PosDailyMetricSnapshot,
} from './observability-core'

// order-ahead-actions ('use server')
export {
  createOrderAheadItem,
  getOrderAheadMenu,
  updateOrderAheadItem,
  placeOrder,
  getOrders,
  updateOrderStatus as updateOrderAheadStatus,
} from './order-ahead-actions'
export type {
  OrderAheadItemStatus,
  OrderStatus,
  OrderAheadItem,
  OrderAheadOrder,
  OrderLineItem,
} from './order-ahead-actions'

// order-queue-actions ('use server')
export {
  createOrderQueueEntry,
  updateOrderStatus as updateOrderQueueStatus,
  cancelOrder,
  getActiveOrders,
  getOrderQueueHistory,
  getOrder,
} from './order-queue-actions'

// parity-dashboard
export { getCloverParityDashboard } from './parity-dashboard'
export type {
  CloverParitySectionProgress,
  CloverParityMvpItemProgress,
  CloverParityMvpProgress,
  CloverParityDashboard,
} from './parity-dashboard'

// payment-actions ('use server')
export { recordPayment, getPaymentsForSale, updatePaymentStatus } from './payment-actions'
export type { RecordPaymentInput } from './payment-actions'

// payment-terminal-actions ('use server')
export { processTerminalCardPayment } from './payment-terminal-actions'
export type { ProcessTerminalPaymentInput } from './payment-terminal-actions'

// pos-audit-log (internal, not re-exported)

// pos-authorization
export {
  isPosManagerApprovalRequired,
  isPosRoleMatrixRequired,
  resolvePosRoleAccessLevel,
  canPosAccessLevelSatisfy,
  assertPosManagerAccess,
  assertPosRoleAccess,
} from './pos-authorization'
export type { PosAccessLevel } from './pos-authorization'

// product-actions ('use server')
export {
  createProduct,
  createQuickBarcodeProduct,
  updateProduct,
  toggleProductActive,
  toggleProduct86,
  listProducts,
  getProduct,
  snapshotProductFromRecipe,
} from './product-actions'
export type {
  CreateProductInput,
  UpdateProductInput,
  CreateQuickBarcodeProductInput,
} from './product-actions'

// product-cost-sync ('use server')
export {
  syncAllProductCosts,
  syncProductCost,
  cascadeIngredientPriceChange,
} from './product-cost-sync'
export type { CostSyncResult } from './product-cost-sync'

// promotion-actions ('use server')
export {
  createPromotion,
  updatePromotion,
  togglePromotionActive,
  listPromotions,
} from './promotion-actions'
export type {
  CommercePromotion,
  CreatePromotionInput,
  UpdatePromotionInput,
} from './promotion-actions'

// promotion-engine
export { PROMOTION_DISCOUNT_TYPES, evaluatePromotionForLines } from './promotion-engine'
export type {
  PromotionDiscountType,
  PromotionRule,
  PromotionLine,
  PromotionEvaluationResult,
} from './promotion-engine'

// receipt-actions ('use server')
export {
  buildReceiptData,
  generateReceipt,
  getReceiptDeliveryTargets,
  sendReceiptByEmail,
  sendReceiptBySms,
} from './receipt-actions'
export type { ReceiptDeliveryTargets } from './receipt-actions'

// reconciliation-actions ('use server')
export {
  generateDailyReconciliation,
  listReconciliationReports,
  getReconciliationReport,
  reviewReconciliationReport,
  resolveReconciliationFlag,
} from './reconciliation-actions'
export type { ReconciliationFlag, GenerateReportInput } from './reconciliation-actions'

// refund-actions ('use server')
export { createRefund, getRefundsForSale } from './refund-actions'
export type { CreateRefundInput } from './refund-actions'

// register-actions ('use server')
export {
  openRegister,
  suspendRegister,
  resumeRegister,
  closeRegister,
  getCurrentRegisterSession,
  getRegisterSessionHistory,
  getRegisterSession,
} from './register-actions'
export type { OpenRegisterInput } from './register-actions'

// register-metrics
export { computeRegisterSessionTotals } from './register-metrics'

// report-actions ('use server')
export {
  getShiftReport,
  getDailySalesReport,
  getProductReport,
  getChannelReport,
  getPaymentMixReport,
} from './report-actions'
export type {
  ShiftReport,
  DailySalesReport,
  ProductReport,
  ChannelReport,
  PaymentMixRow,
  PaymentMixReport,
} from './report-actions'

// sale-actions ('use server')
export {
  createSale,
  addSaleItem,
  removeSaleItem,
  updateSaleItemQuantity,
  voidSale,
  getSale,
  listSales,
} from './sale-actions'
export type { CreateSaleInput, AddSaleItemInput } from './sale-actions'

// sale-fsm
export {
  canTransition,
  getNextStatuses,
  isTerminal,
  isPaid,
  canAcceptPayment,
  canRefund,
  canVoid,
  computeSaleStatus,
} from './sale-fsm'

// schedule-actions ('use server')
export {
  createPaymentSchedule,
  markInstallmentPaid,
  waiveInstallment,
  getPaymentSchedule,
  getOverdueInstallments,
} from './schedule-actions'
export type { CreateScheduleInput } from './schedule-actions'

// settlement-actions ('use server')
export {
  recordSettlement,
  updateSettlementStatus,
  listSettlements,
  getSettlement,
  getSettlementSummary,
} from './settlement-actions'
export type { RecordSettlementInput } from './settlement-actions'

// slo-definitions
export { POS_SLO_DEFINITIONS } from './slo-definitions'
export type { PosSloDefinition } from './slo-definitions'

// table-service-actions ('use server')
export {
  listDiningLayout,
  listOpenDiningChecks,
  createDiningZone,
  createDiningTable,
  setDiningTableStatus,
  openDiningCheck,
  closeDiningCheck,
} from './table-service-actions'

// table-service-types
export type {
  DiningTableStatus,
  DiningCheckStatus,
  DiningZone,
  DiningTable,
  DiningCheck,
  DiningLayoutZone,
  OpenDiningCheckWithTable,
} from './table-service-types'

// tax-actions ('use server')
export { computeSaleLineTax, applySaleTax, previewTax } from './tax-actions'
export type { LineItemTax, SaleTaxResult } from './tax-actions'

// tax-policy
export {
  isTaxableTaxClass,
  hasTaxableItems,
  computeLineTaxCents as computeTaxPolicyLineTaxCents,
  getTenantTaxRateBps,
} from './tax-policy'

// virtual-terminal-actions ('use server')
export { runVirtualTerminalCharge } from './virtual-terminal-actions'
export type { VirtualTerminalInput, VirtualTerminalResult } from './virtual-terminal-actions'
