import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { emails } = await request.json()
  if (!emails || !Array.isArray(emails)) return NextResponse.json([])

  const { data } = await supabase.from('contacts').select('*').in('email', emails)
  return NextResponse.json(data || [])
}