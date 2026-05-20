import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  // Resend sends an array of events
  const events = Array.isArray(body) ? body : [body]

  for (const event of events) {
    const { type, data } = event
    if (!data || !data.email_id) continue

    // Map Resend event types to our event types
    let eventType: string | null = null
    switch (type) {
      case 'email.delivered':
        eventType = 'delivered'
        break
      case 'email.opened':
        eventType = 'opened'
        break
      case 'email.clicked':
        eventType = 'clicked'
        break
      case 'email.bounced':
        eventType = 'bounced'
        break
      case 'email.complained':
        eventType = 'complained'
        break
      case 'email.unsubscribed':
        eventType = 'unsubscribed'
        break
      default:
        // unknown event, skip
        continue
    }

    // Insert event, linking by resend_message_id
    const { error } = await supabase.from('email_events').insert({
      event_type: eventType,
      resend_message_id: data.email_id,
      occurred_at: data.created_at || new Date().toISOString(),
      metadata: {
        ip: data.ip,
        user_agent: data.user_agent,
        link: data.link,
        from: data.from,
        to: data.to,
        // any other fields Resend provides
      },
    })

    if (error) {
      console.error('Failed to store webhook event:', error)
    }
  }

  return NextResponse.json({ received: true })
}