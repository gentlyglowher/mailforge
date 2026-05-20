import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')
  const token = searchParams.get('token')

  if (!email || !token) return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })

  // Verify token (we'll generate token as a hash of email + secret)
  const expectedToken = await generateToken(email)
  if (token !== expectedToken) return NextResponse.json({ error: 'Invalid token' }, { status: 403 })

  const supabase = await createClient()

  // Unsubscribe the contact
  const { error } = await supabase.from('contacts').update({ unsubscribed: true }).eq('email', email)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

// Helper to generate token
async function generateToken(email: string): Promise<string> {
  const secret = process.env.UNSUBSCRIBE_SECRET || 'defaultsecret'
  const encoder = new TextEncoder()
  const data = encoder.encode(email + secret)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}