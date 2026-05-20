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
  const { name, subject, body: htmlBody, list_id, scheduled_at } = body

  if (!subject || !htmlBody || !list_id) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const campaignData: any = {
    name,
    subject,
    body: htmlBody,
    list_id,
    status: scheduled_at ? 'scheduled' : 'draft',
  }
  if (scheduled_at) campaignData.scheduled_at = scheduled_at

  const { data, error } = await supabase.from('campaigns').insert(campaignData).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}