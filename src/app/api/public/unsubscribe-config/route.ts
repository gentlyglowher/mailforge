import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('settings').select('unsubscribe_config').eq('id', 1).single()
  if (error || !data) return NextResponse.json({})
  return NextResponse.json(data.unsubscribe_config || {})
}