import { NextResponse } from 'next/server'
import { checkSpam } from '@/lib/ai'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { subject, body } = await request.json()
  if (!subject || !body) return NextResponse.json({ error: 'Missing subject/body' }, { status: 400 })

  const result = await checkSpam(subject, body)
  return NextResponse.json({ result })
}