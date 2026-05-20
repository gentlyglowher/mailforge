import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import { appendUnsubscribeLink } from '@/lib/email-utils'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data, error } = await supabase.from('campaigns').select('*').eq('id', id).single()
  if (error) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const { name, subject, body: htmlBody } = body

  const { data, error } = await supabase
    .from('campaigns')
    .update({ name, subject, body: htmlBody })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
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

  // 1. Récupérer la campagne
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .single()
  if (campaignError || !campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  // 2. Récupérer les ids des contacts de la liste
  const { data: listContacts, error: listError } = await supabase
    .from('list_contacts')
    .select('contact_id')
    .eq('list_id', campaign.list_id)
  if (listError || !listContacts) return NextResponse.json({ error: 'Failed to get contacts' }, { status: 500 })

  const contactIds = listContacts.map((lc) => lc.contact_id)

  // 3. Récupérer les contacts non désabonnés
  const { data: contacts, error: contactsError } = await supabase
    .from('contacts')
    .select('*')
    .in('id', contactIds)
    .eq('unsubscribed', false)
  if (contactsError) return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 })

  if (!contacts || contacts.length === 0) return NextResponse.json({ error: 'No active contacts in list' }, { status: 400 })

  // URL de base pour le lien de désabonnement
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // 4. Envoyer à chaque contact
  for (const contact of contacts) {
    try {
      let personalSubject = campaign.subject
      let personalHtml = campaign.body
        .replace(/\{\{first_name\}\}/g, contact.first_name || '')
        .replace(/\{\{last_name\}\}/g, contact.last_name || '')

      // Remplacement des champs personnalisés
      if (contact.custom_fields) {
        for (const [key, value] of Object.entries(contact.custom_fields)) {
          const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
          personalSubject = personalSubject.replace(placeholder, value || '')
          personalHtml = personalHtml.replace(placeholder, value || '')
        }
      }

      // Ajouter le lien de désabonnement automatique
      personalHtml = await appendUnsubscribeLink(personalHtml, contact.email, baseUrl)

      const result = await sendEmail({
        to: contact.email,
        subject: personalSubject,
        html: personalHtml,
      })

      // Log dans email_logs (historique)
      await supabase.from('email_logs').insert({
        contact_id: contact.id,
        campaign_id: campaign.id,
        resend_message_id: result.id,
      })

      // Événement "sent" pour les statistiques
      await supabase.from('email_events').insert({
        contact_id: contact.id,
        campaign_id: campaign.id,
        event_type: 'sent',
        resend_message_id: result.id,
        occurred_at: new Date().toISOString(),
      })

    } catch (error) {
      console.error('Failed to send to', contact.email, error)
    }
  }

  // 5. Marquer la campagne comme envoyée
  await supabase
    .from('campaigns')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', id)

  return NextResponse.json({ success: true })
}