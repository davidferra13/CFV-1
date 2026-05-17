export type ChartType =
  | 'bar'
  | 'line'
  | 'pie'
  | 'donut'
  | 'area'
  | 'scatter'
  | 'heatmap'
  | 'sparkline'

export type DataSeries = {
  name: string
  data: number[]
  color?: string
  labels?: string[]
}

export type ChartConfig = {
  id: string
  tenantId: string
  chartId: string
  type: ChartType
  title: string
  series: DataSeries[]
  xAxis?: Record<string, unknown>
  yAxis?: Record<string, unknown>
  legend?: boolean
  responsive?: boolean
  createdAt: Date
}

export type VisualizationPreset = {
  id: string
  tenantId: string
  name: string
  chartId: string
  dateRange: Record<string, unknown> | null
  filters: Record<string, unknown>
  createdAt: Date
}

export type DataVizSummary = {
  totalCharts: number
  byType: Record<ChartType, number>
  totalPresets: number
  mostViewed: string | null
}
