import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data: sequence } = await supabase.from('sequences').select('*').eq('id', id).single()
  if (!sequence) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: steps } = await supabase.from('sequence_steps').select('*').eq('sequence_id', id).order('order')
  return NextResponse.json({ ...sequence, steps })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const { name, steps } = body   // steps : tableau de {type, subject?, body?, wait_hours?}

  // Mettre à jour le nom de la séquence
  const { error: updateError } = await supabase
    .from('sequences')
    .update({ name })
    .eq('id', id)
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  // Supprimer toutes les anciennes étapes
  await supabase.from('sequence_steps').delete().eq('sequence_id', id)

  // Insérer les nouvelles étapes
  if (steps && steps.length > 0) {
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]
      const { error } = await supabase
        .from('sequence_steps')
        .insert({
          sequence_id: id,
          order: i,
          type: step.type,
          subject: step.subject,
          body: step.body,
          wait_hours: step.wait_hours,
        })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { error } = await supabase.from('sequences').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}