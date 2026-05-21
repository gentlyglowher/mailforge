'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Card from '@/components/Card'

type Funnel = {
  id: string
  name: string
  slug: string
  status: string
  created_at: string
}

export default function FunnelsPage() {
  const [funnels, setFunnels] = useState<Funnel[]>([])
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')

  const fetchFunnels = async () => {
    const res = await fetch('/api/funnels')
    if (res.ok) setFunnels(await res.json())
  }

  useEffect(() => { fetchFunnels() }, [])

  const createFunnel = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/funnels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, slug }),
    })
    if (res.ok) {
      fetchFunnels()
      setName('')
      setSlug('')
    } else {
      alert('Error creating funnel')
    }
  }

  const deleteFunnel = async (id: string) => {
    if (!confirm('Delete this funnel?')) return
    await fetch(`/api/funnels/${id}`, { method: 'DELETE' })
    fetchFunnels()
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Funnels</h1>

      <Card className="mb-6">
        <form onSubmit={createFunnel} className="space-y-3">
          <input
            type="text"
            placeholder="Funnel name"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full border p-2 rounded"
            required
          />
          <input
            type="text"
            placeholder="Slug (ex: my-offer)"
            value={slug}
            onChange={e => setSlug(e.target.value)}
            className="w-full border p-2 rounded"
            required
          />
          <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-500">
            Create Funnel
          </button>
        </form>
      </Card>

      <div className="space-y-4">
        {funnels.map(f => (
          <Card key={f.id} className="flex justify-between items-center">
            <div>
              <Link href={`/funnels/${f.id}`} className="font-semibold text-indigo-600 hover:underline">
                {f.name}
              </Link>
              <p className="text-sm text-gray-500">
                /f/{f.slug} – Status: {f.status}
              </p>
            </div>
            <div className="flex gap-2">
              <Link href={`/funnels/${f.id}/edit`} className="text-blue-600 hover:underline">Edit</Link>
              <button onClick={() => deleteFunnel(f.id)} className="text-red-600">Delete</button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}