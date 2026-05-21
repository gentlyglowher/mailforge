import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const {
    name, subject, body: htmlBody, list_id, scheduled_at,
    is_ab_test,
    variant_a_subject, variant_a_body,
    variant_b_subject, variant_b_body,
    test_sample_size, winner_delay_hours,
  } = body

  if (!subject || !htmlBody || !list_id) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Build insert object
  const campaignData: any = {
    name,
    subject,
    body: htmlBody,
    list_id,
    status: scheduled_at ? 'scheduled' : 'draft',
    is_ab_test: is_ab_test || false,
  }

  if (scheduled_at) campaignData.scheduled_at = scheduled_at

  if (is_ab_test) {
    campaignData.variant_a_subject = variant_a_subject || subject
    campaignData.variant_a_body = variant_a_body || htmlBody
    campaignData.variant_b_subject = variant_b_subject || subject
    campaignData.variant_b_body = variant_b_body || htmlBody
    campaignData.test_sample_size = test_sample_size || 20
    campaignData.winner_delay_hours = winner_delay_hours || 4
    campaignData.ab_test_status = 'draft'
  }

  const { data, error } = await supabase.from('campaigns').insert(campaignData).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}