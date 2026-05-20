'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Card from '@/components/Card'

type List = { id: string; name: string }

export default function SequenceDetailPage() {
  const params = useParams()
  const seqId = params.id as string
  const [lists, setLists] = useState<List[]>([])
  const [selectedListId, setSelectedListId] = useState('')
  const [manualContacts, setManualContacts] = useState('')
  const [message, setMessage] = useState('')
  const [triggers, setTriggers] = useState<List[]>([]) // listes déjà liées

  useEffect(() => {
    fetch('/api/lists').then(r => r.json()).then(setLists)
    fetchTriggers()
  }, [])

  const fetchTriggers = async () => {
    const res = await fetch(`/api/sequences/${seqId}/triggers`)
    if (res.ok) {
      const data = await res.json()
      // data: [{ list_id, lists: { name } }]
      setTriggers(data.map((d: any) => ({ id: d.list_id, name: d.lists?.name || d.list_id })))
    }
  }

  const addTrigger = async () => {
    if (!selectedListId) return
    await fetch(`/api/sequences/${seqId}/triggers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ list_id: selectedListId }),
    })
    setSelectedListId('')
    fetchTriggers()
    setMessage('Trigger added. New contacts in this list will automatically start the sequence.')
  }

  const removeTrigger = async (listId: string) => {
    await fetch(`/api/sequences/${seqId}/triggers`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ list_id: listId }),
    })
    fetchTriggers()
  }

  const assignList = async () => {
    if (!selectedListId) return
    const res = await fetch('/api/sequences/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sequence_id: seqId, list_id: selectedListId }),
    })
    const data = await res.json()
    setMessage(`Assigned to ${data.assigned} existing contacts from list.`)
  }

  const assignManual = async () => {
    const emails = manualContacts.split(',').map(e => e.trim()).filter(Boolean)
    if (emails.length === 0) return
    for (const email of emails) {
      await fetch('/api/contacts/ensure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
    }
    const contactRes = await fetch('/api/contacts/by-emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emails }),
    })
    const contacts = await contactRes.json()
    const ids = contacts.map((c: any) => c.id)
    const res = await fetch('/api/sequences/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sequence_id: seqId, contact_ids: ids }),
    })
    const data = await res.json()
    setMessage(`Assigned to ${data.assigned} contacts manually.`)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Manage Sequence</h1>

      <Card className="mb-6">
        <h2 className="font-semibold">Auto-Trigger on List Join</h2>
        <div className="flex items-end gap-2 mt-2">
          <select
            value={selectedListId}
            onChange={e => setSelectedListId(e.target.value)}
            className="border p-2 rounded flex-1"
          >
            <option value="">Select a list</option>
            {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <button onClick={addTrigger} className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-500">
            Add Trigger
          </button>
        </div>
        {triggers.length > 0 && (
          <div className="mt-3">
            <p className="text-sm text-gray-600 mb-1">Active triggers:</p>
            <ul className="list-disc pl-5">
              {triggers.map(list => (
                <li key={list.id} className="flex items-center justify-between">
                  <span>{list.name}</span>
                  <button onClick={() => removeTrigger(list.id)} className="text-red-600 text-sm ml-4">Remove</button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <Card className="mb-6">
        <h2 className="font-semibold">Assign Existing Contacts</h2>
        <select value={selectedListId} onChange={e => setSelectedListId(e.target.value)} className="border p-2 rounded w-full mt-2">
          <option value="">Select list (for existing contacts)</option>
          {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <button onClick={assignList} className="mt-2 bg-indigo-600 text-white px-4 py-2 rounded">Assign</button>
      </Card>

      <Card>
        <h2 className="font-semibold">Assign by Email</h2>
        <textarea
          placeholder="email1@example.com, email2@example.com"
          value={manualContacts}
          onChange={e => setManualContacts(e.target.value)}
          rows={3}
          className="w-full border p-2 rounded mt-2"
        />
        <button onClick={assignManual} className="mt-2 bg-indigo-600 text-white px-4 py-2 rounded">Assign</button>
      </Card>

      {message && <p className="mt-4 p-3 bg-green-100 text-green-800 rounded">{message}</p>}
    </div>
  )
}