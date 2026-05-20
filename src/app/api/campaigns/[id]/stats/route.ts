import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Sent count
  const { count: sentCount } = await supabase
    .from('email_events')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', id)
    .eq('event_type', 'sent')

  // Delivered
  const { count: deliveredCount } = await supabase
    .from('email_events')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', id)
    .eq('event_type', 'delivered')

  // Unique opens
  const { data: opens } = await supabase
    .from('email_events')
    .select('contact_id')
    .eq('campaign_id', id)
    .eq('event_type', 'opened')
  const uniqueOpens = new Set(opens?.map(o => o.contact_id)).size

  // Unique clicks
  const { data: clicks } = await supabase
    .from('email_events')
    .select('contact_id')
    .eq('campaign_id', id)
    .eq('event_type', 'clicked')
  const uniqueClicks = new Set(clicks?.map(c => c.contact_id)).size

  // Bounces
  const { count: bounces } = await supabase
    .from('email_events')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', id)
    .eq('event_type', 'bounced')

  // Complaints
  const { count: complaints } = await supabase
    .from('email_events')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', id)
    .eq('event_type', 'complained')

  // Unsubscribes
  const { count: unsubs } = await supabase
    .from('email_events')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', id)
    .eq('event_type', 'unsubscribed')

  return NextResponse.json({
    sent: sentCount || 0,
    delivered: deliveredCount || 0,
    uniqueOpens,
    uniqueClicks,
    bounces: bounces || 0,
    complaints: complaints || 0,
    unsubscribes: unsubs || 0,
  })
}