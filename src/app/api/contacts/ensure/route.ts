import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { email } = await request.json()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const { data, error } = await supabase.from('contacts').upsert({ email }, { onConflict: 'email' }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}