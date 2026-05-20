import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { startContactInSequence } from '@/lib/sequences'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data, error } = await supabase
    .from('list_contacts')
    .select('contact:contacts(*)')
    .eq('list_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const contacts = data.map(d => d.contact).filter(Boolean)
  return NextResponse.json(contacts)
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const { email, first_name, last_name, custom_fields } = body // ajout

  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  // Upsert contact by email
  const { data: contact, error: contactError } = await supabase
    .from('contacts')
    .upsert({ email, first_name, last_name, custom_fields: custom_fields || {} }, { onConflict: 'email' })
    .select()
    .single()

  if (contactError) return NextResponse.json({ error: contactError.message }, { status: 500 })

  // Add to list if not already there
  const { error: linkError } = await supabase
    .from('list_contacts')
    .upsert({ list_id: id, contact_id: contact.id }, { onConflict: 'list_id,contact_id' })

  if (linkError) return NextResponse.json({ error: linkError.message }, { status: 500 })

  // Après avoir upserté le contact et le lien
  const { data: triggers } = await supabase
    .from('sequence_triggers')
    .select('sequence_id')
    .eq('list_id', id)

  if (triggers) {
    for (const trigger of triggers) {
      await startContactInSequence(contact.id, trigger.sequence_id)
    }
  }

  return NextResponse.json(contact)
}