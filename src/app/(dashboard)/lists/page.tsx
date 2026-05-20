'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Card from '@/components/Card'

type List = {
  id: string
  name: string
  description: string
  created_at: string
}

export default function ListsPage() {
  const [lists, setLists] = useState<List[]>([])
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')

  const fetchLists = async () => {
    const res = await fetch('/api/lists')
    if (res.ok) setLists(await res.json())
  }

  useEffect(() => { fetchLists() }, [])

  const createList = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch('/api/lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, description: newDesc }),
    })
    setNewName('')
    setNewDesc('')
    fetchLists()
  }

  const deleteList = async (id: string) => {
    await fetch(`/api/lists/${id}`, { method: 'DELETE' })
    fetchLists()
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Contact Lists</h1>

      <Card className="mb-6">
        <form onSubmit={createList} className="space-y-3">
          <input
            type="text"
            placeholder="List name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full rounded border p-2 text-gray-900"
            required
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            className="w-full rounded border p-2 text-gray-900"
          />
          <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-500">
            Create List
          </button>
        </form>
      </Card>

      <div className="space-y-4">
        {lists.map(list => (
          <Card key={list.id} className="flex justify-between items-center">
            <div>
              <Link href={`/lists/${list.id}`} className="text-lg font-semibold text-indigo-600 hover:underline">
                {list.name}
              </Link>
              <p className="text-sm text-gray-500">{list.description}</p>
            </div>
            <button onClick={() => deleteList(list.id)} className="text-red-600 hover:text-red-800">Delete</button>
          </Card>
        ))}
      </div>
    </div>
  )
}