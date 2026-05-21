import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string; pageId: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, pageId } = await params
  const body = await request.json()
  const { config, list_id, lead_magnet_url } = body

  const { error } = await supabase
    .from('funnel_pages')
    .update({
      config: config || {},
      list_id: list_id || null,
      lead_magnet_url: lead_magnet_url || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', pageId)
    .eq('funnel_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}