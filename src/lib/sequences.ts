import { createClient } from '@/lib/supabase/server'

export async function startContactInSequence(contactId: string, sequenceId: string) {
  const supabase = await createClient()

  // Récupérer le premier step
  const { data: firstStep } = await supabase
    .from('sequence_steps')
    .select('*')
    .eq('sequence_id', sequenceId)
    .order('order')
    .limit(1)
    .single()

  if (!firstStep) return

  let nextSendAt = new Date()
  if (firstStep.type === 'wait') {
    nextSendAt = new Date(Date.now() + firstStep.wait_hours * 60 * 60 * 1000)
  }

  const { error } = await supabase
    .from('contact_sequences')
    .upsert(
      {
        contact_id: contactId,
        sequence_id: sequenceId,
        current_step_index: 0,
        next_send_at: nextSendAt.toISOString(),
        status: 'active',
      },
      { onConflict: 'contact_id,sequence_id' }
    )
  return error
}