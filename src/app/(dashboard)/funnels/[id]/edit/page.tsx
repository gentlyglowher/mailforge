'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Card from '@/components/Card'

type FunnelPage = {
  id: string
  type: string
  order: number
  config: any
  list_id: string | null
  lead_magnet_url: string | null
}

type Funnel = {
  id: string
  name: string
  slug: string
  status: string
  pages: FunnelPage[]
}

const pageTypeLabels: Record<string, string> = {
  capture: 'Capture',
  landing: 'Landing Page',
  sales: 'Sales Page',
  thank_you: 'Thank You Page',
  download: 'Download Page',
}

export default function FunnelPagesEditor() {
  const params = useParams()
  const funnelId = params.id as string
  const router = useRouter()

  const [funnel, setFunnel] = useState<Funnel | null>(null)
  const [pages, setPages] = useState<FunnelPage[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Fetch funnel data
  useEffect(() => {
    const fetchFunnel = async () => {
      const res = await fetch(`/api/funnels/${funnelId}`)
      if (res.ok) {
        const data = await res.json()
        setFunnel(data)
        setPages(data.pages || [])
      }
      setLoading(false)
    }
    fetchFunnel()
  }, [funnelId])

  // Move a page up/down
  const movePage = (index: number, direction: 'up' | 'down') => {
    const newPages = [...pages]
    if (direction === 'up' && index > 0) {
      ;[newPages[index - 1], newPages[index]] = [newPages[index], newPages[index - 1]]
    } else if (direction === 'down' && index < pages.length - 1) {
      ;[newPages[index], newPages[index + 1]] = [newPages[index + 1], newPages[index]]
    }
    setPages(newPages)
  }

  // Delete a page
  const deletePage = (index: number) => {
    if (!confirm('Delete this page?')) return
    setPages(pages.filter((_, i) => i !== index))
  }

  const addPage = async (type: string) => {
    // Add a placeholder page locally
    const newPage = {
        id: `temp-${Date.now()}`,
        type,
        order: pages.length,
        config: {},
        list_id: null,
        lead_magnet_url: null,
    }
    const updatedPages = [...pages, newPage]
    setPages(updatedPages)
    // Automatically save the funnel to generate a real id for the new page
    const res = await fetch(`/api/funnels/${funnelId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pages: updatedPages.map(p => ({ ...p, id: p.id.startsWith('temp-') ? undefined : p.id })) }),
    })
    if (res.ok) {
        // Refetch the funnel to get the real ids
        const refreshed = await fetch(`/api/funnels/${funnelId}`)
        const data = await refreshed.json()
        setPages(data.pages || [])
    } else {
        alert('Failed to save new page')
    }
  }

  // Save all pages
  const savePages = async () => {
    setSaving(true)
    const res = await fetch(`/api/funnels/${funnelId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pages }),
    })
    if (res.ok) {
      alert('Funnel updated!')
      router.refresh()
    } else {
      alert('Error saving')
    }
    setSaving(false)
  }

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Pages of: {funnel?.name}</h1>
        <div className="flex gap-2">
          <button onClick={savePages} disabled={saving} className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-500 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Order & Pages'}
          </button>
          <button onClick={() => router.push('/funnels')} className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300">
            Back to Funnels
          </button>
        </div>
      </div>

      {/* Add page dropdown */}
      <Card className="mb-6">
        <details className="relative">
          <summary className="bg-indigo-600 text-white px-4 py-2 rounded cursor-pointer inline-block">+ Add Page</summary>
          <div className="absolute mt-2 bg-white border rounded shadow-lg z-10">
            {Object.entries(pageTypeLabels).map(([type, label]) => (
              <button
                key={type}
                onClick={() => addPage(type)}
                className="block w-full text-left px-4 py-2 hover:bg-gray-100"
              >
                {label}
              </button>
            ))}
          </div>
        </details>
      </Card>

      {/* Page list */}
      {pages.length === 0 && (
        <p className="text-gray-500">No pages yet. Add one to start building your funnel.</p>
      )}
      <div className="space-y-3">
        {pages.map((page, idx) => (
          <Card key={page.id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => movePage(idx, 'up')}
                  disabled={idx === 0}
                  className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30"
                >
                  ▲
                </button>
                <button
                  onClick={() => movePage(idx, 'down')}
                  disabled={idx === pages.length - 1}
                  className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30"
                >
                  ▼
                </button>
              </div>
              <div>
                <p className="font-semibold">{pageTypeLabels[page.type] || page.type}</p>
                <p className="text-xs text-gray-500">Order: {idx + 1}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push(`/funnels/${funnelId}/edit/${page.id}`)}
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-500"
              >
                Edit Page
              </button>
              <button
                onClick={() => deletePage(idx)}
                className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-500"
              >
                Delete
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}