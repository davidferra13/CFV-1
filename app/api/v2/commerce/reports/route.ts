// API v2: Commerce Reports - Various report types
// GET /api/v2/commerce/reports?type=shift|daily|product|channel|payment-mix&from=...&to=...&sessionId=...

import { NextRequest } from 'next/server'
import { withApiAuth, apiSuccess, apiError } from '@/lib/api/v2'
import {
  getShiftReport,
  getDailySalesReport,
  getProductReport,
  getChannelReport,
  getPaymentMixReport,
} from '@/lib/commerce/report-actions'

export const GET = withApiAuth(
  async (req: NextRequest, _ctx) => {
    const url = new URL(req.url)
    const type = url.searchParams.get('type')
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    const sessionId = url.searchParams.get('sessionId')

    if (!type) {
      return apiError(
        'missing_type',
        'Query parameter "type" is required (shift, daily, product, channel, payment-mix)',
        400
      )
    }

    try {
      switch (type) {
        case 'shift': {
          if (!sessionId) {
            return apiError(
              'missing_session_id',
              'Query parameter "sessionId" is required for shift reports',
              400
            )
          }
          const report = await getShiftReport(sessionId)
          return apiSuccess(report)
        }
        case 'daily': {
          if (!from || !to) {
            return apiError(
              'missing_date_range',
              'Query parameters "from" and "to" are required for daily reports',
              400
            )
          }
          const report = await getDailySalesReport(from, to)
          return apiSuccess(report)
        }
        case 'product': {
          if (!from || !to) {
            return apiError(
              'missing_date_range',
              'Query parameters "from" and "to" are required for product reports',
              400
            )
          }
          const report = await getProductReport(from, to)
          return apiSuccess(report)
        }
        case 'channel': {
          if (!from || !to) {
            return apiError(
              'missing_date_range',
              'Query parameters "from" and "to" are required for channel reports',
              400
            )
          }
          const report = await getChannelReport(from, to)
          return apiSuccess(report)
        }
        case 'payment-mix': {
          if (!from || !to) {
            return apiError(
              'missing_date_range',
              'Query parameters "from" and "to" are required for payment-mix reports',
              400
            )
          }
          const report = await getPaymentMixReport(from, to)
          return apiSuccess(report)
        }
        default:
          return apiError(
            'invalid_type',
            `Unknown report type "${type}". Valid types: shift, daily, product, channel, payment-mix`,
            400
          )
      }
    } catch (err: any) {
      return apiError('report_failed', err.message ?? 'Failed to generate report', 500)
    }
  },
  { scopes: ['commerce:read'] }
)
