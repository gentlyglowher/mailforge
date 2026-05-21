import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const supabase = await createClient()
  const { slug } = await params
  const body = await request.json()
  const { email, first_name, last_name, list_id, redirect } = body

  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  // If a list_id is provided, add contact to that list
  if (list_id) {
    // Upsert contact
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .upsert({ email, first_name, last_name }, { onConflict: 'email' })
      .select()
      .single()

    if (contactError) return NextResponse.json({ error: contactError.message }, { status: 500 })

    // Add to list
    await supabase.from('list_contacts').upsert(
      { list_id, contact_id: contact.id },
      { onConflict: 'list_id,contact_id' }
    )
  }

  // Return the redirect info (can be a page index or a full URL)
  return NextResponse.json({ success: true, redirect })
}