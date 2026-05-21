import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data: events } = await supabase
    .from('email_events')
    .select('contact_id, metadata')
    .eq('campaign_id', id)
    .eq('event_type', 'opened')

  const opensA = new Set(events?.filter(e => e.metadata?.variant === 'A').map(e => e.contact_id)).size
  const opensB = new Set(events?.filter(e => e.metadata?.variant === 'B').map(e => e.contact_id)).size

  return NextResponse.json({ opensA, opensB })
}