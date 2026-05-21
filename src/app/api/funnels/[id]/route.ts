import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data: funnel, error } = await supabase
    .from('funnels')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !funnel) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: steps } = await supabase
    .from('funnel_steps')
    .select('*')
    .eq('funnel_id', id)
    .order('order')

  return NextResponse.json({ ...funnel, steps: steps || [] })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const { name, slug, status, steps } = body

  const { error: updateError } = await supabase
    .from('funnels')
    .update({ name, slug, status, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  // Replace steps if provided
  if (steps && Array.isArray(steps)) {
    await supabase.from('funnel_steps').delete().eq('funnel_id', id)
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]
      const { error } = await supabase.from('funnel_steps').insert({
        funnel_id: id,
        order: i,
        type: step.type,
        config: step.config || {},
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
  const { error } = await supabase.from('funnels').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}