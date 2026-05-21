import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const supabase = await createClient()
  const { slug } = await params

  // Récupérer le funnel
  const { data: funnel, error: funnelError } = await supabase
    .from('funnels')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (funnelError || !funnel) return NextResponse.json({ error: 'Funnel not found' }, { status: 404 })

  // Récupérer l'email depuis le body
  const { email, first_name, last_name } = await request.json()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  // Upsert le contact
  const { data: contact, error: contactError } = await supabase
    .from('contacts')
    .upsert({ email, first_name, last_name }, { onConflict: 'email' })
    .select()
    .single()

  if (contactError) return NextResponse.json({ error: contactError.message }, { status: 500 })

  // Démarrer le funnel pour ce contact
  const { error: progressError } = await supabase
    .from('funnel_contacts')
    .upsert({
      funnel_id: funnel.id,
      contact_id: contact.id,
      current_step_index: 0,
      status: 'active',
      started_at: new Date().toISOString(),
    }, { onConflict: 'funnel_id,contact_id' })

  if (progressError) return NextResponse.json({ error: progressError.message }, { status: 500 })

  return NextResponse.json({ success: true, message: 'Entered funnel', funnel_name: funnel.name })
}