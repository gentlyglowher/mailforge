import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { data, error } = await supabase
    .from('list_custom_fields')
    .select('field_name, required')
    .eq('list_id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // return array of { field_name, required }
  return NextResponse.json(data.map(d => ({ field_name: d.field_name, required: d.required })))
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { field_name, required = false } = await request.json()
  if (!field_name) return NextResponse.json({ error: 'field_name required' }, { status: 400 })

  const { error } = await supabase
    .from('list_custom_fields')
    .upsert({ list_id: id, field_name, required }, { onConflict: 'list_id,field_name' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { field_name, required } = await request.json()
  if (!field_name) return NextResponse.json({ error: 'field_name required' }, { status: 400 })

  const { error } = await supabase
    .from('list_custom_fields')
    .update({ required })
    .eq('list_id', id)
    .eq('field_name', field_name)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { field_name } = await request.json()
  const { error } = await supabase
    .from('list_custom_fields')
    .delete()
    .eq('list_id', id)
    .eq('field_name', field_name)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}