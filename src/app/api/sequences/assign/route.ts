import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { sequence_id, list_id, contact_ids } = await request.json()
  if (!sequence_id) return NextResponse.json({ error: 'sequence_id required' }, { status: 400 })

  // Get the first step to know if it's email or wait
  const { data: firstStep } = await supabase.from('sequence_steps')
    .select('*')
    .eq('sequence_id', sequence_id)
    .order('order')
    .limit(1)
    .single()

  if (!firstStep) return NextResponse.json({ error: 'Sequence has no steps' }, { status: 400 })

  let contactsToAssign: any[] = []

  if (list_id) {
    const { data: listContacts } = await supabase
      .from('list_contacts')
      .select('contact:contacts(*)')
      .eq('list_id', list_id)
    contactsToAssign = listContacts?.map(lc => lc.contact).filter(Boolean) || []
  } else if (contact_ids && contact_ids.length > 0) {
    const { data: contacts } = await supabase.from('contacts').select('*').in('id', contact_ids)
    contactsToAssign = contacts || []
  }

  let assigned = 0
  for (const contact of contactsToAssign) {
    // Calculate next_send_at based on first step type
    let nextSendAt = new Date()
    if (firstStep.type === 'wait') {
      nextSendAt = new Date(Date.now() + firstStep.wait_hours * 60 * 60 * 1000)
    } // else immediately

    const { error } = await supabase.from('contact_sequences').upsert({
      contact_id: contact.id,
      sequence_id,
      current_step_index: 0,
      next_send_at: nextSendAt.toISOString(),
      status: 'active',
    }, { onConflict: 'contact_id,sequence_id' })
    if (!error) assigned++
  }

  return NextResponse.json({ assigned })
}