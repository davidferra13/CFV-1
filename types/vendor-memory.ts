export interface VendorCallMetric {
  id: string
  chef_id: string
  vendor_phone: string
  vendor_name: string
  total_calls: number
  answered_calls: number
  voicemail_calls: number
  failed_calls: number
  avg_response_quality: number
  avg_price_competitiveness: number
  last_answer_time: string | null
  best_call_window: string | null
  consecutive_no_answers: number
  last_call_at: string | null
  last_answered_at: string | null
  price_points: Array<{ ingredient: string; price: number; unit: string; date: string }>
  created_at: string
  updated_at: string
}

export interface SmartVendorCandidate {
  id: string
  name: string
  vendor_type: string
  phone: string
  contact_name: string | null
  is_preferred: boolean
  relevance_score: number
  source: 'saved' | 'national'
  address: string | null
  city: string | null
  state: string | null
  // Memory-enhanced fields
  memory_score: number
  answer_rate: number | null
  best_call_window: string | null
  consecutive_no_answers: number
  is_deprioritized: boolean
}
