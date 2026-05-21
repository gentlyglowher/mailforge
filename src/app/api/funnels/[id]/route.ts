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

  const { data: pages } = await supabase
    .from('funnel_pages')
    .select('*')
    .eq('funnel_id', id)
    .order('order')

  return NextResponse.json({ ...funnel, pages: pages || [] })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const { name, slug, status, pages } = body

  // Update funnel meta
  const { error: updateError } = await supabase
    .from('funnels')
    .update({ name, slug, status, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  // Replace pages if provided
  if (pages && Array.isArray(pages)) {
    // Delete existing pages
    await supabase.from('funnel_pages').delete().eq('funnel_id', id)

    // Insert new pages with correct order
    for (let i = 0; i < pages.length; i++) {
      const p = pages[i]
      const { error: insertError } = await supabase
        .from('funnel_pages')
        .insert({
          funnel_id: id,
          type: p.type,
          order: i,
          config: p.config || {},
          list_id: p.list_id || null,
          lead_magnet_url: p.lead_magnet_url || null,
        })

      if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
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