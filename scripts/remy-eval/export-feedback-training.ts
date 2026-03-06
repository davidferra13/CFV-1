/**
 * Export Remy Feedback as Training Data
 *
 * Pulls positively-rated Remy interactions from the remy_feedback table
 * and converts them to ShareGPT format for fine-tuning.
 *
 * Only exports conversations where the chef gave positive feedback (thumbs up),
 * ensuring the fine-tuned model learns from good interactions.
 *
 * Run: npx tsx scripts/remy-eval/export-feedback-training.ts
 *
 * Output: scripts/remy-eval/training-data/remy-feedback-export.jsonl
 */

import { createClient } from '@supabase/supabase-js'
import { writeFileSync, mkdirSync } from 'fs'
import { resolve } from 'path'

// ShareGPT format
interface ShareGPTMessage {
  from: 'system' | 'human' | 'gpt'
  value: string
}

interface ShareGPTConversation {
  conversations: ShareGPTMessage[]
  metadata?: {
    source: string
    feedbackId: string
    rating: string
  }
}

// Default system prompt for training (veteran archetype as baseline)
const REMY_SYSTEM_PROMPT = `You are Remy, a seasoned kitchen veteran AI concierge for ChefFlow. You help private chefs manage their business: revenue, clients, events, scheduling, communications, and operations. You're warm, direct, and food-first. Kitchen metaphors come naturally. You NEVER generate recipes — that's the chef's creative domain. You celebrate wins, stay calm in chaos, and always back up your advice with real data.`

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    console.error(
      'Run with: npx tsx --env-file=.env.local scripts/remy-eval/export-feedback-training.ts'
    )
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  console.log('Fetching positive Remy feedback...')

  // Get all positive feedback entries
  const { data: feedback, error } = await supabase
    .from('remy_feedback')
    .select('id, user_message, remy_response, rating, created_at')
    .eq('rating', 'positive')
    .order('created_at', { ascending: true })
    .limit(2000)

  if (error) {
    console.error('Database error:', error.message)
    process.exit(1)
  }

  if (!feedback || feedback.length === 0) {
    console.log('No positive feedback found yet. As chefs use Remy and give thumbs-up,')
    console.log('their conversations will be exported here for fine-tuning.')
    console.log(
      '\nTo seed initial training data, use: npx tsx scripts/remy-eval/generate-training-data.ts'
    )
    process.exit(0)
  }

  console.log(`Found ${feedback.length} positive interactions`)

  // Convert to ShareGPT format
  const conversations: ShareGPTConversation[] = []

  for (const fb of feedback) {
    if (!fb.user_message || !fb.remy_response) continue

    // Skip very short interactions (likely not informative)
    if (fb.user_message.length < 5 || fb.remy_response.length < 10) continue

    conversations.push({
      conversations: [
        { from: 'system', value: REMY_SYSTEM_PROMPT },
        { from: 'human', value: fb.user_message },
        { from: 'gpt', value: fb.remy_response },
      ],
      metadata: {
        source: 'remy_feedback',
        feedbackId: fb.id,
        rating: fb.rating,
      },
    })
  }

  // Write output
  const outputDir = resolve(__dirname, 'training-data')
  mkdirSync(outputDir, { recursive: true })

  const outputPath = resolve(outputDir, 'remy-feedback-export.jsonl')
  const lines = conversations.map((c) => JSON.stringify(c))
  writeFileSync(outputPath, lines.join('\n') + '\n')

  console.log(`\nExported ${conversations.length} conversations to:`)
  console.log(`  ${outputPath}`)
  console.log(`\nTo merge with seed data:`)
  console.log(
    `  cat training-data/remy-sharegpt.jsonl training-data/remy-feedback-export.jsonl > training-data/remy-combined.jsonl`
  )
  console.log(`\nTo train:`)
  console.log(`  python scripts/remy-eval/train-remy.py --data training-data/remy-combined.jsonl`)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
