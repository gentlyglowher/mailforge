import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data, error } = await supabase.from('campaigns').select('*').eq('id', id).single()
  if (error) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { error } = await supabase.from('campaigns').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // 1. Get the campaign
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .single()
  if (campaignError || !campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  // 2. Get all contact_ids from the campaign's list
  const { data: listContacts, error: listError } = await supabase
    .from('list_contacts')
    .select('contact_id')
    .eq('list_id', campaign.list_id)
  if (listError || !listContacts) return NextResponse.json({ error: 'Failed to get contacts' }, { status: 500 })

  const contactIds = listContacts.map((lc) => lc.contact_id)

  // 3. Fetch those contacts (only active, not unsubscribed)
  const { data: contacts, error: contactsError } = await supabase
    .from('contacts')
    .select('*')
    .in('id', contactIds)
    .eq('unsubscribed', false)
  if (contactsError) return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 })

  if (!contacts || contacts.length === 0) return NextResponse.json({ error: 'No active contacts in list' }, { status: 400 })

  // 4. Send to each contact
  for (const contact of contacts) {
    try {
      const personalSubject = campaign.subject
      let personalHtml = campaign.body
        .replace(/\{\{first_name\}\}/g, contact.first_name || '')
        .replace(/\{\{last_name\}\}/g, contact.last_name || '')

      const result = await sendEmail({
        to: contact.email,
        subject: personalSubject,
        html: personalHtml,
      })

      await supabase.from('email_logs').insert({
        contact_id: contact.id,
        campaign_id: campaign.id,
        resend_message_id: result.id,
      })
    } catch (error) {
      console.error('Failed to send to', contact.email, error)
    }
  }

  // 5. Mark campaign as sent
  await supabase
    .from('campaigns')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', id)

  return NextResponse.json({ success: true })
}