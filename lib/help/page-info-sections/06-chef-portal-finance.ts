import type { PageInfoEntry } from '../page-info-types'

export const CHEF_PORTAL_FINANCE_PAGE_INFO: Record<string, PageInfoEntry> = {
  '/finance': {
    title: 'Finance Hub',
    description:
      'Central hub for all financial management - invoices, expenses, ledger, payments, reporting, and tax.',
    features: [
      'Quick revenue, refund, and profit metrics',
      '16 section tiles for every financial tool',
      'YTD carry-forward savings',
      'Navigate to invoices, expenses, ledger, payments, payouts, reporting, and tax',
    ],
  },

  '/financials': {
    title: 'Financial Dashboard',
    description: 'Full financial dashboard - revenue, expenses, targets, and trends.',
    features: ['Revenue and expense tracking', 'Goal progress', 'Monthly trends', 'Profit margins'],
  },

  '/finance/overview': {
    title: 'Finance Overview',
    description: 'High-level financial health - total revenue, expenses, and outstanding balances.',
    features: [
      'Total revenue collected',
      'Business expenses summary',
      'Outstanding balances alert',
      'Links to revenue summary, outstanding payments, and cash flow',
    ],
  },

  '/finance/overview/outstanding-payments': {
    title: 'Outstanding Payments',
    description: 'Past events with unpaid balances - follow up to collect.',
    features: [
      'Outstanding amount total',
      'Days overdue indicator',
      'Severity highlighting for 30+ days',
    ],
  },

  '/finance/overview/cash-flow': {
    title: 'Cash Flow',
    description: 'Revenue vs. expenses over 12 months - see your cash position.',
    features: ['12-month rolling view', 'Gross and net revenue', 'Monthly expense breakdown'],
  },

  '/finance/overview/revenue-summary': {
    title: 'Revenue Summary',
    description: 'Revenue breakdown from confirmed and completed events.',
    features: [
      'Total quoted revenue',
      'Completed revenue',
      'Average per event',
      'Status breakdown',
    ],
  },

  '/finance/invoices': {
    title: 'Invoices',
    description:
      'All event invoices organized by status - draft, sent, paid, overdue, refunded, cancelled.',
    features: [
      '6 status stages with totals',
      'Invoice value summaries',
      'Awaiting payment counts',
      'Quick navigation to each status',
    ],
  },

  '/finance/invoices/draft': {
    title: 'Draft Invoices',
    description: 'Invoices not yet sent to clients - review and finalize.',
    features: ['Draft count and potential value', 'Quick send actions'],
  },

  '/finance/invoices/sent': {
    title: 'Sent Invoices',
    description: 'Invoices sent and awaiting client payment.',
    features: ['Pending total value', 'Days since sent', 'Payment reminder options'],
  },

  '/finance/invoices/paid': {
    title: 'Paid Invoices',
    description: 'Invoices that have been paid in full.',
    features: ['Paid total', 'Completed event count', 'Payment confirmation dates'],
  },

  '/finance/invoices/overdue': {
    title: 'Overdue Invoices',
    description: 'Invoices past their due date - needs immediate attention.',
    features: ['Overdue total', 'Days overdue indicator', 'Critical alerts for 30+ days'],
  },

  '/finance/invoices/refunded': {
    title: 'Refunded Invoices',
    description: 'Events with refund entries in the ledger.',
    features: ['Refund total', 'Refund reason tracking', 'Event linkage'],
  },

  '/finance/invoices/cancelled': {
    title: 'Cancelled Invoices',
    description: 'Invoices for cancelled events.',
    features: ['Lost revenue tracking', 'Cancellation reasons', 'Refund status'],
  },

  '/finance/expenses': {
    title: 'Expenses',
    description:
      'All business expenses broken down by category - food, labor, marketing, and more.',
    features: [
      '7 expense categories',
      'Business vs. personal separation',
      'Category spending breakdown',
      'Event-linked expenses',
    ],
  },

  '/finance/expenses/food-ingredients': {
    title: 'Food & Ingredients',
    description: 'Grocery, alcohol, and specialty ingredient costs.',
    features: ['3 subcategories', 'Total food costs', 'Per-category breakdown'],
  },

  '/finance/expenses/labor': {
    title: 'Labor Costs',
    description: 'Staff and labor expenses for events.',
    features: ['Total labor spend', 'Per-event labor costs', 'Staff payment tracking'],
  },

  '/finance/expenses/marketing': {
    title: 'Marketing Expenses',
    description: 'Advertising and marketing spend.',
    features: ['Total marketing spend', 'Vendor breakdown', 'ROI tracking'],
  },

  '/finance/expenses/miscellaneous': {
    title: 'Miscellaneous Expenses',
    description: 'Insurance, professional services, education, utilities, and other costs.',
    features: ['5 subcategories', 'Category totals', 'Active category tracking'],
  },

  '/finance/expenses/rentals-equipment': {
    title: 'Rentals & Equipment',
    description: 'Equipment rental, supplies, venue, and uniform costs.',
    features: ['4 subcategories', 'Per-event rental costs', 'Vendor tracking'],
  },

  '/finance/expenses/software': {
    title: 'Software & Subscriptions',
    description: 'SaaS tools and subscription costs.',
    features: ['Vendor-by-vendor breakdown', 'Monthly recurring costs', 'Unique vendor count'],
  },

  '/finance/expenses/travel': {
    title: 'Travel Expenses',
    description: 'Gas, mileage, vehicle, and travel costs.',
    features: ['Mileage logging', 'Gas and vehicle costs', 'Total miles tracked'],
  },

  '/finance/ledger': {
    title: 'Ledger',
    description:
      'Immutable transaction log - the source of truth for all financial data in ChefFlow.',
    features: [
      'Total entries and revenue recorded',
      'Refunds recorded',
      'Recent entries preview',
      'Links to adjustments and full transaction log',
    ],
  },

  '/finance/ledger/adjustments': {
    title: 'Ledger Adjustments',
    description: 'Credits, add-ons, and manual adjustments to the ledger.',
    features: ['Credits issued', 'Add-ons charged', 'Adjustment history by date'],
  },

  '/finance/ledger/transaction-log': {
    title: 'Transaction Log',
    description: 'Complete chronological record of every financial transaction.',
    features: ['CSV export', 'Total collected and refunded', 'Full transaction table'],
  },

  '/finance/payments': {
    title: 'Payments',
    description: 'All payment activity - deposits, installments, refunds, and failed payments.',
    features: [
      'Total received and refunded',
      'Net received',
      'Navigate to deposits, installments, refunds, and failed',
    ],
  },

  '/finance/payments/deposits': {
    title: 'Deposits',
    description: 'Deposit payments received from clients.',
    features: ['Deposit count and total', 'Deposit table by event'],
  },

  '/finance/payments/installments': {
    title: 'Installments',
    description: 'Installment and final payments received.',
    features: ['Total received', 'Installment vs. final split', 'Payment schedule tracking'],
  },

  '/finance/payments/refunds': {
    title: 'Refunds',
    description: 'Payments returned to clients.',
    features: ['Total refunded', 'Refund entries count', 'Events with refunds'],
  },

  '/finance/payments/failed': {
    title: 'Failed Payments',
    description: 'Stalled or failed payment attempts.',
    features: ['Past-due payments', 'Upcoming payment alerts', 'Stripe dashboard reference'],
  },

  '/finance/payouts': {
    title: 'Payouts',
    description: 'How you receive money - Stripe and manual payment tracking.',
    features: [
      'Gross revenue',
      'Total refunds',
      'Net after refunds',
      'Stripe and manual payout links',
    ],
  },

  '/finance/payouts/stripe-payouts': {
    title: 'Stripe Payouts',
    description: 'Automated transfers from Stripe Connect to your bank.',
    features: ['Stripe status', 'Net received', 'Platform fees', 'Transfer history'],
  },

  '/finance/payouts/manual-payments': {
    title: 'Manual Payments',
    description: 'Cash, Venmo, Zelle, and other offline payments.',
    features: ['Total received', 'Payment entry count', 'Payment history table'],
  },

  '/finance/payouts/reconciliation': {
    title: 'Reconciliation',
    description: 'Match event invoices against recorded ledger payments.',
    features: ['Fully reconciled events', 'Partially recorded', 'Unrecorded gaps'],
  },

  '/finance/reporting': {
    title: 'Reporting Hub',
    description: 'Financial reports and export-ready insights.',
    features: [
      'YTD revenue and event count',
      'Business expenses this month',
      'Stage conversion funnel',
      '8 report categories',
    ],
  },

  '/finance/reporting/revenue-by-month': {
    title: 'Revenue by Month',
    description: '12-month rolling revenue trend.',
    features: [
      'CSV export',
      'Gross and net revenue',
      'Best month highlight',
      'Monthly trend table',
    ],
  },

  '/finance/reporting/revenue-by-client': {
    title: 'Revenue by Client',
    description: 'Lifetime value per client - who generates the most revenue.',
    features: ['CSV export', 'Client LTV ranking', 'Top client highlight'],
  },

  '/finance/reporting/revenue-by-event': {
    title: 'Revenue by Event',
    description: 'Events ranked by invoice value.',
    features: ['Total invoice value', 'Completed revenue', 'Average event value', 'Event ranking'],
  },

  '/finance/reporting/profit-loss': {
    title: 'Profit & Loss',
    description: 'Full P&L statement with revenue, expenses, and net profit.',
    features: ['Year selector', 'KPI cards', 'Monthly revenue chart', 'Expense breakdown'],
  },

  '/finance/reporting/profit-by-event': {
    title: 'Profit by Event',
    description: 'Invoice revenue minus direct expenses for each event.',
    features: ['Net profit per event', 'Profit margin', 'Events ranked by profitability'],
  },

  '/finance/reporting/expense-by-category': {
    title: 'Expense by Category',
    description: 'Spending breakdown across all expense categories.',
    features: ['Category totals', 'Percentage of total spend', 'Active category count'],
  },

  '/finance/reporting/tax-summary': {
    title: 'Tax Summary',
    description: 'Business income and expense summary for tax preparation.',
    features: [
      'Year selector',
      'Gross income',
      'Business expenses',
      'Net income',
      'Category breakdown',
    ],
  },

  '/finance/reporting/year-to-date-summary': {
    title: 'Year-to-Date Summary',
    description: 'Financial overview from January 1 through today.',
    features: ['YTD revenue cards', 'Monthly progress', '6 key KPIs', 'All-time summary'],
  },

  '/finance/tax': {
    title: 'Tax Center',
    description:
      'Tax preparation tools - mileage log, quarterly estimates, and accountant exports.',
    features: [
      'Mileage summary',
      'Quarterly tax estimates (Q1-Q4)',
      'Year selector',
      'AI tax deduction suggestions',
    ],
  },

  '/finance/tax/quarterly': {
    title: 'Quarterly Estimates',
    description: 'Estimated quarterly tax payments.',
    features: ['Q1-Q4 estimates', 'Income and deduction inputs', 'Payment tracking'],
  },

  '/finance/tax/year-end': {
    title: 'Year-End Report',
    description: 'Complete annual tax summary for your accountant.',
    features: ['Annual revenue', 'Expense breakdown', 'Net income', 'Exportable report'],
  },

  '/finance/tax/1099-nec': {
    title: '1099 Contractors',
    description: 'Track contractor payments for 1099-NEC filing.',
    features: ['Contractor payment totals', 'YTD tracking', '1099 compliance'],
  },

  '/finance/tax/depreciation': {
    title: 'Depreciation',
    description: 'Track equipment depreciation for tax deductions.',
    features: ['Asset list', 'Depreciation schedules', 'Annual deduction amounts'],
  },

  '/finance/tax/home-office': {
    title: 'Home Office Deduction',
    description: 'Calculate and track home office deductions.',
    features: ['Square footage method', 'Simplified method', 'Annual deduction calculation'],
  },

  '/finance/tax/retirement': {
    title: 'Retirement Contributions',
    description: 'Track retirement account contributions for tax deductions.',
    features: ['SEP IRA / Solo 401k tracking', 'Contribution limits', 'Deduction amounts'],
  },

  '/finance/cash-flow': {
    title: 'Cash Flow Calendar',
    description: 'Monthly view of projected income, expenses, and payment plan installments.',
    features: ['Cash position projection', 'Interactive forecast chart', '30-day outlook'],
  },

  '/finance/forecast': {
    title: 'Revenue Forecast',
    description: 'Projected revenue based on historical data and current pipeline.',
    features: [
      'Average monthly revenue',
      'Projected annual total',
      'Trend indicator (up/down/stable)',
      '3-month projection cards',
    ],
  },

  '/finance/goals': {
    title: 'Revenue Goals',
    description: 'Set annual revenue targets and track progress toward them.',
    features: ['Goal setter', 'Annual progress bar', 'Monthly tracking', 'Gap-closing strategies'],
  },

  '/finance/recurring': {
    title: 'Recurring Invoices',
    description: 'Automated billing for repeat clients and retainer agreements.',
    features: ['Recurring invoice setup', 'Client selector', 'Billing frequency options'],
  },

  '/finance/retainers': {
    title: 'Retainers',
    description: 'Recurring service agreements with clients.',
    features: ['Active retainer count', 'Monthly recurring revenue (MRR)', 'Retainer status table'],
  },

  '/finance/retainers/new': {
    title: 'New Retainer',
    description: 'Create a new retainer agreement with a client.',
    features: ['Client selection', 'Service terms', 'Billing schedule', 'Amount configuration'],
  },

  '/finance/retainers/[id]': {
    title: 'Retainer Detail',
    description: 'View and manage a specific retainer agreement.',
    features: ['Agreement terms', 'Payment history', 'Usage tracking', 'Renewal options'],
  },

  '/finance/sales-tax': {
    title: 'Sales Tax',
    description: 'Track collected, outstanding, and remitted sales tax.',
    features: ['Tax configuration', 'Sales tax summary', 'Remittance history'],
  },

  '/finance/sales-tax/remittances': {
    title: 'Tax Remittances',
    description: "Sales tax remittance history - what you've sent to tax authorities.",
    features: ['Remittance records', 'Filing dates', 'Amounts remitted'],
  },

  '/finance/sales-tax/settings': {
    title: 'Sales Tax Settings',
    description: 'Configure sales tax rates, nexus, and collection rules.',
    features: ['Tax rate configuration', 'Nexus settings', 'Collection automation'],
  },

  '/finance/bank-feed': {
    title: 'Bank Feed',
    description: 'Connect bank accounts and reconcile transactions.',
    features: ['Bank connection status', 'Pending transactions', 'Reconciliation summary'],
  },

  '/finance/disputes': {
    title: 'Payment Disputes',
    description: 'Track and manage chargebacks and payment disputes.',
    features: ['Dispute tracker', 'Stripe dispute linkage', 'Resolution status'],
  },

  '/finance/contractors': {
    title: '1099 Contractors',
    description: 'Manage contractor payments, YTD tracking, and 1099 filing.',
    features: ['Contractor list', 'YTD payments', '1099 summary', 'Compliance tracking'],
  },

  '/finance/payroll': {
    title: 'Payroll',
    description: 'Employee payroll management hub.',
    features: ['Employee list', 'Payroll runs', 'Tax forms (941, W2)'],
  },

  '/finance/payroll/employees': {
    title: 'Employees',
    description: 'Employee list and payroll details.',
    features: ['Employee roster', 'Pay rates', 'Tax withholding'],
  },

  '/finance/payroll/run': {
    title: 'Run Payroll',
    description: 'Process a payroll run for employees.',
    features: ['Hours input', 'Pay calculation', 'Tax withholding', 'Payment processing'],
  },

  '/finance/payroll/941': {
    title: '941 Filing',
    description: 'Quarterly 941 tax form filing for employee withholdings.',
    features: ['Quarterly filing', 'Withholding summary', 'Filing status'],
  },

  '/finance/payroll/w2': {
    title: 'W-2 Management',
    description: 'Year-end W-2 form generation for employees.',
    features: ['W-2 generation', 'Employee distribution', 'Filing records'],
  },
}
