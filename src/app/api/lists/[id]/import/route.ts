import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { csvText } = await request.json()
  if (!csvText) return NextResponse.json({ error: 'No CSV text provided' }, { status: 400 })

  // Simple CSV parser: expects headers in first line: email,first_name,last_name
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) return NextResponse.json({ error: 'No data rows' }, { status: 400 })

  const headers = lines[0].split(',').map((h:string) => h.trim().toLowerCase())
  const emailIdx = headers.indexOf('email')
  if (emailIdx === -1) return NextResponse.json({ error: 'CSV must have an email column' }, { status: 400 })

  const results = { imported: 0, errors: 0 }
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v:string) => v.trim())
    if (values.length < headers.length) continue
    const email = values[emailIdx]
    const first_name = headers.includes('first_name') ? values[headers.indexOf('first_name')] : ''
    const last_name = headers.includes('last_name') ? values[headers.indexOf('last_name')] : ''

    // Upsert contact
    const { data: contact, error } = await supabase
      .from('contacts')
      .upsert({ email, first_name, last_name }, { onConflict: 'email' })
      .select()
      .single()

    if (error) {
      results.errors++
      continue
    }

    // Add to list
    const { error: linkError } = await supabase
      .from('list_contacts')
      .upsert({ list_id: params.id, contact_id: contact.id }, { onConflict: 'list_id,contact_id' })

    if (!linkError) results.imported++
  }

  return NextResponse.json(results)
}