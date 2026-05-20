import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { csvText } = await request.json()
  if (!csvText) return NextResponse.json({ error: 'No CSV text provided' }, { status: 400 })

  const lines = csvText.trim().split('\n')
  if (lines.length < 2) return NextResponse.json({ error: 'No data rows' }, { status: 400 })

  // Parse headers
  const headers = lines[0].split(',').map((h: string) => h.trim().toLowerCase())
  const emailIdx = headers.indexOf('email')
  if (emailIdx === -1) return NextResponse.json({ error: 'CSV must have an email column' }, { status: 400 })

  const fnIdx = headers.indexOf('first_name')
  const lnIdx = headers.indexOf('last_name')

  // Detect custom fields (any column that is not email, first_name, last_name)
  const customFieldIndices: { name: string; idx: number }[] = []
  headers.forEach((header : string, idx : number) => {
    if (header !== 'email' && header !== 'first_name' && header !== 'last_name') {
      customFieldIndices.push({ name: header, idx })
    }
  })

  const results = { imported: 0, errors: 0 }

  // Process each row (skip header line)
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v: string) => v.trim())
    if (values.length < headers.length) {
      results.errors++
      continue
    }

    const email = values[emailIdx]
    const first_name = fnIdx !== -1 ? values[fnIdx] : ''
    const last_name = lnIdx !== -1 ? values[lnIdx] : ''

    // Build custom_fields object from additional columns
    const customFieldsObj: Record<string, string> = {}
    customFieldIndices.forEach(({ name, idx }) => {
      customFieldsObj[name] = values[idx] || ''
    })

    // Upsert contact
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .upsert(
        { email, first_name, last_name, custom_fields: customFieldsObj },
        { onConflict: 'email' }
      )
      .select()
      .single()

    if (contactError || !contact) {
      results.errors++
      continue
    }

    // Link contact to list
    const { error: linkError } = await supabase
      .from('list_contacts')
      .upsert(
        { list_id: id, contact_id: contact.id },
        { onConflict: 'list_id,contact_id' }
      )

    if (!linkError) {
      results.imported++
    } else {
      results.errors++
    }
  }

  return NextResponse.json(results)
}