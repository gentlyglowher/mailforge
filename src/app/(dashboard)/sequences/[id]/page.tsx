'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

type List = { id: string; name: string }
type Contact = { id: string; email: string; first_name: string; last_name: string }

export default function SequenceDetailPage() {
  const params = useParams()
  const seqId = params.id as string
  const [lists, setLists] = useState<List[]>([])
  const [selectedListId, setSelectedListId] = useState('')
  const [manualContacts, setManualContacts] = useState('') // comma-separated emails
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('/api/lists').then(r => r.json()).then(setLists)
  }, [])

  const assignList = async () => {
    if (!selectedListId) return
    const res = await fetch('/api/sequences/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sequence_id: seqId, list_id: selectedListId }),
    })
    const data = await res.json()
    setMessage(`Assigned to ${data.assigned} contacts from list.`)
  }

  const assignManual = async () => {
    const emails = manualContacts.split(',').map(e => e.trim()).filter(Boolean)
    if (emails.length === 0) return
    // First ensure contacts exist
    // For simplicity, we'll just create contacts if they don't exist via API
    // Here we'll use a quick approach: call /api/contacts/ensure or just upsert via list assignment
    // Instead, we'll create a simple endpoint to ensure contacts by email
    // I'll show a quick workaround: use the lists/[id]/contacts route? Not ideal.
    // Let's create a new endpoint: /api/contacts/ensure
    // But for now, we can direct upsert via fetch
    // I'll just create a quick local function
    for (const email of emails) {
      await fetch('/api/contacts/ensure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
    }
    // Get contact ids
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
      <h1 className="text-2xl font-bold mb-4">Assign Sequence to Contacts</h1>

      <div className="bg-white p-4 rounded shadow mb-6 space-y-3">
        <h2 className="font-semibold">Assign to a whole list</h2>
        <select value={selectedListId} onChange={e => setSelectedListId(e.target.value)} className="border p-2 rounded w-full">
          <option value="">Select list</option>
          {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <button onClick={assignList} className="bg-indigo-600 text-white px-4 py-2 rounded">Assign</button>
      </div>

      <div className="bg-white p-4 rounded shadow space-y-3">
        <h2 className="font-semibold">Assign manually by email</h2>
        <textarea
          placeholder="email1@example.com, email2@example.com"
          value={manualContacts}
          onChange={e => setManualContacts(e.target.value)}
          rows={3}
          className="w-full border p-2 rounded"
        />
        <button onClick={assignManual} className="bg-indigo-600 text-white px-4 py-2 rounded">Assign</button>
      </div>

      {message && <p className="mt-4 p-3 bg-green-100 text-green-800 rounded">{message}</p>}
    </div>
  )
}