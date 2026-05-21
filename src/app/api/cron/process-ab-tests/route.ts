import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import { appendUnsubscribeLink } from '@/lib/email-utils'

export async function GET() {
  const supabase = await createClient()
  const now = new Date()

  // Find A/B tests that are 'test_sent'
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*')
    .eq('is_ab_test', true)
    .eq('ab_test_status', 'test_sent')

  if (!campaigns || campaigns.length === 0) return NextResponse.json({ processed: 0 })

  for (const campaign of campaigns) {
    const testSentAt = new Date(campaign.test_sent_at)
    const winnerDelay = (campaign.winner_delay_hours || 4) * 60 * 60 * 1000
    if (now.getTime() - testSentAt.getTime() < winnerDelay) continue

    // Determine winner based on unique opens
    const { data: events } = await supabase
      .from('email_events')
      .select('contact_id, metadata')
      .eq('campaign_id', campaign.id)
      .eq('event_type', 'opened')

    const opensA = new Set(events?.filter(e => e.metadata?.variant === 'A').map(e => e.contact_id)).size
    const opensB = new Set(events?.filter(e => e.metadata?.variant === 'B').map(e => e.contact_id)).size

    const winner = opensA >= opensB ? 'A' : 'B'

    // Mark winner
    await supabase.from('campaigns').update({
      winning_variant: winner,
      ab_test_status: 'winner_selected'
    }).eq('id', campaign.id)

    // Get all contacts in list
    const { data: listContacts } = await supabase
      .from('list_contacts')
      .select('contact_id')
      .eq('list_id', campaign.list_id)

    if (!listContacts || listContacts.length === 0) {
      await supabase.from('campaigns').update({
        ab_test_status: 'completed',
        status: 'sent'
      }).eq('id', campaign.id)
      continue
    }

    const allContactIds = listContacts.map(lc => lc.contact_id)

    // Get contacts who already received (any sent event)
    const { data: sentContacts } = await supabase
      .from('email_events')
      .select('contact_id')
      .eq('campaign_id', campaign.id)
      .eq('event_type', 'sent')

    const sentIds = new Set((sentContacts || []).map(s => s.contact_id))
    const remainingIds = allContactIds.filter(id => !sentIds.has(id))

    if (remainingIds.length === 0) {
      await supabase.from('campaigns').update({
        ab_test_status: 'completed',
        status: 'sent'
      }).eq('id', campaign.id)
      continue
    }

    // Fetch remaining contacts
    const { data: remainingContacts } = await supabase
      .from('contacts')
      .select('*')
      .in('id', remainingIds)
      .eq('unsubscribed', false)

    if (!remainingContacts || remainingContacts.length === 0) {
      await supabase.from('campaigns').update({
        ab_test_status: 'completed',
        status: 'sent'
      }).eq('id', campaign.id)
      continue
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    for (const contact of remainingContacts) {
      let subject = campaign.subject
      let htmlBody = campaign.body
      if (winner === 'A') {
        subject = campaign.variant_a_subject || subject
        htmlBody = campaign.variant_a_body || htmlBody
      } else {
        subject = campaign.variant_b_subject || subject
        htmlBody = campaign.variant_b_body || htmlBody
      }

      let personalHtml = htmlBody
        .replace(/\{\{first_name\}\}/g, contact.first_name || '')
        .replace(/\{\{last_name\}\}/g, contact.last_name || '')
      if (contact.custom_fields) {
        for (const [key, value] of Object.entries(contact.custom_fields)) {
          personalHtml = personalHtml.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '')
        }
      }
      personalHtml = await appendUnsubscribeLink(personalHtml, contact.email, baseUrl)

      try {
        const result = await sendEmail({
          to: contact.email,
          subject,
          html: personalHtml,
        })
        await supabase.from('email_events').insert({
          contact_id: contact.id,
          campaign_id: campaign.id,
          event_type: 'sent',
          resend_message_id: result.id,
          occurred_at: new Date().toISOString(),
          metadata: { variant: winner }
        })
      } catch (error) {
        console.error('Failed to send winner email', error)
      }
    }

    await supabase.from('campaigns').update({
      ab_test_status: 'completed',
      status: 'sent'
    }).eq('id', campaign.id)
  }

  return NextResponse.json({ processed: campaigns.length })
}