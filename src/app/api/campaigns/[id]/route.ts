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

  // 2. Récupérer les contacts de la liste (non désabonnés)
  const { data: listContacts, error: listError } = await supabase
    .from('list_contacts')
    .select('contact_id')
    .eq('list_id', campaign.list_id)
  if (listError || !listContacts) return NextResponse.json({ error: 'Failed to get contacts' }, { status: 500 })

  const contactIds = listContacts.map(lc => lc.contact_id)
  const { data: contacts, error: contactsError } = await supabase
    .from('contacts')
    .select('*')
    .in('id', contactIds)
    .eq('unsubscribed', false)
  if (contactsError) return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 })

  if (!contacts || contacts.length === 0) return NextResponse.json({ error: 'No active contacts in list' }, { status: 400 })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // ---- A/B TEST LOGIC ----
  if (campaign.is_ab_test && campaign.ab_test_status === 'draft') {
    const sampleSize = Math.round((campaign.test_sample_size / 100) * contacts.length)
    if (sampleSize < 2) return NextResponse.json({ error: 'Not enough contacts for A/B test' }, { status: 400 })

    // Shuffle and split
    const shuffled = [...contacts].sort(() => Math.random() - 0.5)
    const testGroup = shuffled.slice(0, sampleSize)
    const remainingGroup = shuffled.slice(sampleSize)

    // Send variant A to first half of test group, variant B to second half
    const half = Math.ceil(testGroup.length / 2)
    const groupA = testGroup.slice(0, half)
    const groupB = testGroup.slice(half)

    // Send to group A
    for (const contact of groupA) {
      await sendCampaignEmail(supabase, campaign, contact, 'A', baseUrl)
    }
    // Send to group B
    for (const contact of groupB) {
      await sendCampaignEmail(supabase, campaign, contact, 'B', baseUrl)
    }

    // Update campaign: store remaining contacts, status test_sent, and schedule winner selection
    await supabase.from('campaigns').update({
      ab_test_status: 'test_sent',
      test_sent_at: new Date().toISOString(),
      // We'll store remaining contacts in a new table or as a JSON field? We'll reuse a simple approach: we'll create an AB test queue table later, but for now we can store the remaining count and re-fetch later.
      // Instead, we'll save the list_id and we can re-query non-openers later. That's fine.
      status: 'test_sent'
    }).eq('id', campaign.id)

    return NextResponse.json({ success: true, message: `A/B test sent to ${testGroup.length} contacts. Winner will be selected in ${campaign.winner_delay_hours} hours.` })
  }

  // Normal send (no A/B or already processing)
  for (const contact of contacts) {
    await sendCampaignEmail(supabase, campaign, contact, null, baseUrl)
  }

  await supabase.from('campaigns').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', campaign.id)
  return NextResponse.json({ success: true })
}

// Helper function to send a single campaign email (variant optional)
async function sendCampaignEmail(supabase: any, campaign: any, contact: any, variant: string | null, baseUrl: string) {
  let subject = campaign.subject
  let htmlBody = campaign.body

  if (variant === 'A') {
    subject = campaign.variant_a_subject || subject
    htmlBody = campaign.variant_a_body || htmlBody
  } else if (variant === 'B') {
    subject = campaign.variant_b_subject || subject
    htmlBody = campaign.variant_b_body || htmlBody
  }

  // Merge tags
  let personalSubject = subject
  let personalHtml = htmlBody
    .replace(/\{\{first_name\}\}/g, contact.first_name || '')
    .replace(/\{\{last_name\}\}/g, contact.last_name || '')
  if (contact.custom_fields) {
    for (const [key, value] of Object.entries(contact.custom_fields)) {
      const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
      personalSubject = personalSubject.replace(placeholder, value || '')
      personalHtml = personalHtml.replace(placeholder, value || '')
    }
  }

  personalHtml = await appendUnsubscribeLink(personalHtml, contact.email, baseUrl)

  const result = await sendEmail({
    to: contact.email,
    subject: personalSubject,
    html: personalHtml,
  })

  // Log event
  await supabase.from('email_events').insert({
    contact_id: contact.id,
    campaign_id: campaign.id,
    event_type: 'sent',
    resend_message_id: result.id,
    occurred_at: new Date().toISOString(),
    metadata: { variant }  // optionally store which variant was sent
  })
}