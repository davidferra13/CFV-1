export async function updateProgress(
  db: any,
  sessionId: string,
  message: string,
  extraFields?: Record<string, unknown>
) {
  await db
    .from('prospect_scrub_sessions')
    .update({ progress_message: message, ...extraFields })
    .eq('id', sessionId)
}
