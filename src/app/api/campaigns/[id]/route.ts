import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase.from('campaigns').select('*').eq('id', params.id).single()
  if (error) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase.from('campaigns').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  // Used to trigger sending manually (status = 'sending')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { campaign } = await supabase.from('campaigns').select('*').eq('id', params.id).single()
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Get all contacts from the campaign's list
  const { data: listContacts } = await supabase
    .from('list_contacts')
    .select('contact:contacts(*)')
    .eq('list_id', campaign.list_id)

  if (!listContacts) return NextResponse.json({ error: 'No contacts in list' }, { status: 400 })

  const contacts = listContacts.map(lc => lc.contact).filter(Boolean)

  // Send each email
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

      // Log the email
      await supabase.from('email_logs').insert({
        contact_id: contact.id,
        campaign_id: campaign.id,
        resend_message_id: result.id,
      })
    } catch (error) {
      console.error('Failed to send to', contact.email, error)
    }
  }

  // Mark campaign as sent
  await supabase.from('campaigns').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', params.id)

  return NextResponse.json({ success: true })
}