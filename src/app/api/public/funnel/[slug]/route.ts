import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const supabase = await createClient()
  const { slug } = await params

  const { data: funnel, error } = await supabase
    .from('funnels')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (error || !funnel) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: pages } = await supabase
    .from('funnel_pages')
    .select('*')
    .eq('funnel_id', funnel.id)
    .order('order')

  return NextResponse.json({ ...funnel, pages: pages || [] })
}