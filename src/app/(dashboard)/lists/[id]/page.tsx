'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Card from '@/components/Card'

type Contact = {
  id: string
  email: string
  first_name: string
  last_name: string
}

export default function ListDetailPage() {
  const params = useParams()
  const listId = params.id as string
  const [contacts, setContacts] = useState<Contact[]>([])
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [csvText, setCsvText] = useState('')

  const fetchContacts = async () => {
    const res = await fetch(`/api/lists/${listId}/contacts`)
    if (res.ok) setContacts(await res.json())
  }

  useEffect(() => { fetchContacts() }, [])

  const addContact = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch(`/api/lists/${listId}/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, first_name: firstName, last_name: lastName }),
    })
    setEmail(''); setFirstName(''); setLastName('')
    fetchContacts()
  }

  const importCsv = async () => {
    const res = await fetch(`/api/lists/${listId}/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csvText }),
    })
    const result = await res.json()
    alert(`Imported: ${result.imported}, Errors: ${result.errors}`)
    setCsvText('')
    fetchContacts()
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Contacts in List</h1>

      {/* Add single contact */}
      <Card className="mb-6">
        <form onSubmit={addContact} className="space-y-3">
          <h2 className="font-semibold">Add a Contact</h2>
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border p-2 rounded" required />
          <input type="text" placeholder="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full border p-2 rounded" />
          <input type="text" placeholder="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full border p-2 rounded" />
          <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-500">Add</button>
        </form>
      </Card>

      {/* CSV Import */}
      <Card className="mb-6">
        <h2 className="font-semibold">Import CSV</h2>
        <textarea
          placeholder="Paste CSV with headers: email,first_name,last_name"
          value={csvText}
          onChange={e => setCsvText(e.target.value)}
          rows={5}
          className="w-full border p-2 rounded mt-2"
        />
        <button onClick={importCsv} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-500 mt-2">Import</button>
      </Card>

      {/* Contacts table */}
      <Card>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">First Name</th>
              <th className="p-3 text-left">Last Name</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map(c => (
              <tr key={c.id} className="border-t">
                <td className="p-3">{c.email}</td>
                <td className="p-3">{c.first_name}</td>
                <td className="p-3">{c.last_name}</td>
              </tr>
            ))}
            {contacts.length === 0 && (
              <tr><td className="p-3 text-gray-500" colSpan={3}>No contacts yet.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}