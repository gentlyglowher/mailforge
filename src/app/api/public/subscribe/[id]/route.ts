import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { startContactInSequence } from '@/lib/sequences'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params

  // Get list name and form config
  const { data: list, error: listError } = await supabase.from('lists').select('name, form_config').eq('id', id).single()
  if (listError || !list) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Get custom fields for this list
  const { data: fields } = await supabase.from('list_custom_fields').select('field_name, required').eq('list_id', id)
  
  return NextResponse.json({
    listName: list.name,
    formConfig: list.form_config || {},
    fields: fields || [],
  })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params
  const body = await request.json()
  const { email, first_name, last_name, ...customFields } = body

  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  // Check required fields
  const { data: fieldDefs } = await supabase.from('list_custom_fields').select('field_name, required').eq('list_id', id)
  if (fieldDefs) {
    for (const field of fieldDefs) {
      if (field.required && !customFields[field.field_name]) {
        return NextResponse.json({ error: `${field.field_name} is required` }, { status: 400 })
      }
    }
  }

  // Upsert contact
  const { data: contact, error: contactError } = await supabase
    .from('contacts')
    .upsert({ email, first_name, last_name, custom_fields: customFields }, { onConflict: 'email' })
    .select()
    .single()

  if (contactError) return NextResponse.json({ error: contactError.message }, { status: 500 })

  // Add to list
  await supabase.from('list_contacts').upsert({ list_id: id, contact_id: contact.id }, { onConflict: 'list_id,contact_id' })

  // Trigger auto-sequences if any
  const { data: triggers } = await supabase.from('sequence_triggers').select('sequence_id').eq('list_id', id)
  if (triggers) {
    for (const trigger of triggers) {
      await startContactInSequence(contact.id, trigger.sequence_id)
    }
  }

  return NextResponse.json({ success: true })
}