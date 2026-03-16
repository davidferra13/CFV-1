import { Card, CardContent } from '@/components/ui/card'
import {
  getInquiryConversionContext,
  type InquiryConversionContext,
} from '@/lib/intelligence/inquiry-conversion-context'
import { formatCurrency } from '@/lib/utils/currency'

interface InquiryIntelligencePanelProps {
  inquiryId: string
  guestCount: number | null
  occasion: string | null
  budgetCents: number | null
  channel: string
  createdAt: string
}

export async function InquiryIntelligencePanel(props: InquiryIntelligencePanelProps) {
  const context = await getInquiryConversionContext(props).catch(() => null)

  if (!context) return null

  const likelihoodColor =
    context.conversionLabel === 'very likely'
      ? 'text-emerald-400'
      : context.conversionLabel === 'likely'
        ? 'text-green-400'
        : context.conversionLabel === 'possible'
          ? 'text-amber-400'
          : 'text-stone-400'

  const likelihoodBg =
    context.conversionLabel === 'very likely'
      ? 'bg-emerald-950 border-emerald-800/40'
      : context.conversionLabel === 'likely'
        ? 'bg-green-950 border-green-800/40'
        : context.conversionLabel === 'possible'
          ? 'bg-amber-950 border-amber-800/40'
          : 'bg-stone-900 border-stone-700/40'

  return (
    <Card className="border-brand-800/30 bg-brand-950/10">
      <CardContent className="py-4 px-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold text-brand-400 uppercase tracking-wider">
            Conversion Intelligence
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Conversion Likelihood */}
          <div className={`rounded-lg border p-3 ${likelihoodBg}`}>
            <p className="text-xs text-stone-500 mb-1">Conversion Likelihood</p>
            <p className={`text-2xl font-bold ${likelihoodColor}`}>
              {context.conversionLikelihood}%
            </p>
            <p className={`text-xs font-medium mt-0.5 ${likelihoodColor}`}>
              {context.conversionLabel}
            </p>
            <p className="text-xs text-stone-500 mt-1">
              {context.similarConvertedCount}/{context.similarInquiriesCount} similar inquiries
              converted
            </p>
          </div>

          {/* Pipeline Position */}
          <div className="rounded-lg border border-stone-700/40 bg-stone-900 p-3">
            <p className="text-xs text-stone-500 mb-1">Pipeline Position</p>
            <p className="text-2xl font-bold text-stone-100">
              #{context.pipelinePosition.thisRank}
            </p>
            <p className="text-xs text-stone-500 mt-0.5">
              of {context.pipelinePosition.totalOpen} open inquiries
            </p>
            {context.pipelinePosition.estimatedPipelineValueCents > 0 && (
              <p className="text-xs text-stone-500 mt-1">
                Pipeline: {formatCurrency(context.pipelinePosition.estimatedPipelineValueCents)}
              </p>
            )}
          </div>

          {/* Pricing Benchmark or Avg Days */}
          {context.pricingBenchmark ? (
            <div className="rounded-lg border border-stone-700/40 bg-stone-900 p-3">
              <p className="text-xs text-stone-500 mb-1">Price Benchmark</p>
              <p className="text-2xl font-bold text-stone-100">
                ${Math.round(context.pricingBenchmark.medianPerGuestCents / 100)}/guest
              </p>
              <p className="text-xs text-stone-500 mt-0.5">
                Range: ${Math.round(context.pricingBenchmark.rangeLowCents / 100)}-$
                {Math.round(context.pricingBenchmark.rangeHighCents / 100)}/guest
              </p>
              <p className="text-xs text-stone-500 mt-1">
                From {context.pricingBenchmark.dataPoints} converted events
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-stone-700/40 bg-stone-900 p-3">
              <p className="text-xs text-stone-500 mb-1">Avg Time to Convert</p>
              <p className="text-2xl font-bold text-stone-100">
                {context.avgDaysToConvert ? `${context.avgDaysToConvert}d` : '-'}
              </p>
              <p className="text-xs text-stone-500 mt-0.5">
                {context.avgDaysToConvert ? 'average for similar inquiries' : 'Not enough data yet'}
              </p>
            </div>
          )}
        </div>

        {/* Factors */}
        {context.factors.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {context.factors.map((factor, i) => (
              <span key={i} className="text-xs bg-stone-800 text-stone-400 px-2 py-0.5 rounded">
                {factor}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
