import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase.from('sequences').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, steps } = await request.json() // steps: array of {type, subject, body, wait_hours}
  if (!name || !steps) return NextResponse.json({ error: 'Name and steps required' }, { status: 400 })

  // Insert sequence
  const { data: sequence, error: seqError } = await supabase.from('sequences').insert({ name }).select().single()
  if (seqError) return NextResponse.json({ error: seqError.message }, { status: 500 })

  // Insert steps
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    const { error } = await supabase.from('sequence_steps').insert({
      sequence_id: sequence.id,
      order: i,
      type: step.type,
      subject: step.subject,
      body: step.body,
      wait_hours: step.wait_hours,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(sequence)
}

export async function DELETE(request: Request) {
  // handle delete if needed; for now using single delete route
}