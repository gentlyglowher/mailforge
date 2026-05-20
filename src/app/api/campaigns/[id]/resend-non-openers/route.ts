import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { subject } = await request.json()
  if (!subject) return NextResponse.json({ error: 'Subject required' }, { status: 400 })

  // Récupérer la campagne originale
  const { data: campaign } = await supabase.from('campaigns').select('*').eq('id', id).single()
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  // Récupérer les contacts de la liste
  const { data: listContacts } = await supabase
    .from('list_contacts')
    .select('contact_id')
    .eq('list_id', campaign.list_id)
  if (!listContacts || listContacts.length === 0) return NextResponse.json({ error: 'No contacts' }, { status: 400 })

  const contactIds = listContacts.map(lc => lc.contact_id)

  // Contacts qui ont ouvert cette campagne
  const { data: openedContacts } = await supabase
    .from('email_events')
    .select('contact_id')
    .eq('campaign_id', id)
    .eq('event_type', 'opened')
  const openedIds = new Set(openedContacts?.map(o => o.contact_id))

  // Non-openers
  const nonOpenerIds = contactIds.filter(cid => !openedIds.has(cid))

  // Récupérer leurs données
  const { data: nonOpeners } = await supabase
    .from('contacts')
    .select('*')
    .in('id', nonOpenerIds)
    .eq('unsubscribed', false)

  if (!nonOpeners || nonOpeners.length === 0) return NextResponse.json({ error: 'No non-openers found' }, { status: 400 })

  // Créer une nouvelle campagne pour ce renvoi
  const { data: newCampaign } = await supabase
    .from('campaigns')
    .insert({
      name: `${campaign.name} (resend)`,
      subject,
      body: campaign.body,
      list_id: campaign.list_id,
      status: 'sending',
    })
    .select()
    .single()

  if (!newCampaign) return NextResponse.json({ error: 'Failed to create resend campaign' }, { status: 500 })

  for (const contact of nonOpeners) {
    let personalHtml = campaign.body
      .replace(/\{\{first_name\}\}/g, contact.first_name || '')
      .replace(/\{\{last_name\}\}/g, contact.last_name || '')
    // custom fields
    if (contact.custom_fields) {
      for (const [key, value] of Object.entries(contact.custom_fields)) {
        personalHtml = personalHtml.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '')
      }
    }

    const result = await sendEmail({
      to: contact.email,
      subject,
      html: personalHtml,
    })

    await supabase.from('email_events').insert({
      contact_id: contact.id,
      campaign_id: newCampaign.id,
      event_type: 'sent',
      resend_message_id: result.id,
      occurred_at: new Date().toISOString(),
    })
  }

  await supabase.from('campaigns').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', newCampaign.id)

  return NextResponse.json({ success: true, campaign_id: newCampaign.id })
}