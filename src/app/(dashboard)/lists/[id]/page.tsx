'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Card from '@/components/Card'

type Contact = {
  id: string
  email: string
  first_name: string
  last_name: string
  custom_fields: Record<string, string>
}

export default function ListDetailPage() {
  const params = useParams()
  const listId = params.id as string
  const [contacts, setContacts] = useState<Contact[]>([])
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [csvText, setCsvText] = useState('')
  const [customFields, setCustomFields] = useState<string[]>([])
  const [newFieldName, setNewFieldName] = useState('')
  // Pour le formulaire d'ajout, on a besoin de stocker les valeurs des champs custom
  const [customValues, setCustomValues] = useState<Record<string, string>>({})

  const fetchContacts = async () => {
    const res = await fetch(`/api/lists/${listId}/contacts`)
    if (res.ok) setContacts(await res.json())
  }

  const fetchCustomFields = async () => {
    const res = await fetch(`/api/lists/${listId}/fields`)
    if (res.ok) setCustomFields(await res.json())
  }

  useEffect(() => {
    fetchContacts()
    fetchCustomFields()
  }, [])

  const addContact = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch(`/api/lists/${listId}/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        first_name: firstName,
        last_name: lastName,
        custom_fields: customValues,
      }),
    })
    setEmail(''); setFirstName(''); setLastName('')
    setCustomValues({})
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

  const addCustomField = async () => {
    if (!newFieldName.trim()) return
    await fetch(`/api/lists/${listId}/fields`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field_name: newFieldName.trim() }),
    })
    setNewFieldName('')
    fetchCustomFields()
  }

  const removeCustomField = async (fieldName: string) => {
    await fetch(`/api/lists/${listId}/fields`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field_name: fieldName }),
    })
    fetchCustomFields()
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Contacts in List</h1>

      {/* Custom fields management */}
      <Card className="mb-6">
        <h2 className="font-semibold mb-2">Custom Fields for this List</h2>
        <div className="flex flex-wrap gap-2 mb-3">
          {customFields.map(field => (
            <span key={field} className="inline-flex items-center bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm">
              {field}
              <button
                onClick={() => removeCustomField(field)}
                className="ml-2 text-indigo-600 hover:text-red-600"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="New field name (e.g., company)"
            value={newFieldName}
            onChange={e => setNewFieldName(e.target.value)}
            className="flex-1 border p-2 rounded"
          />
          <button onClick={addCustomField} className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-500">
            Add
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          These fields will appear when adding/importing contacts. Use them as merge tags like {`{{fieldname}}`}.
        </p>
      </Card>

      {/* Add single contact */}
      <Card className="mb-6">
        <form onSubmit={addContact} className="space-y-3">
          <h2 className="font-semibold">Add a Contact</h2>
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border p-2 rounded" required />
          <input type="text" placeholder="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full border p-2 rounded" />
          <input type="text" placeholder="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full border p-2 rounded" />
          {/* Dynamic custom fields */}
          {customFields.map(field => (
            <input
              key={field}
              type="text"
              placeholder={field}
              value={customValues[field] || ''}
              onChange={e => setCustomValues({ ...customValues, [field]: e.target.value })}
              className="w-full border p-2 rounded"
            />
          ))}
          <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-500">Add</button>
        </form>
      </Card>

      {/* CSV Import */}
      <Card className="mb-6">
        <h2 className="font-semibold">Import CSV</h2>
        <textarea
          placeholder="Paste CSV with headers: email,first_name,last_name,company,..."
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
              {customFields.map(field => (
                <th key={field} className="p-3 text-left capitalize">{field}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {contacts.map(c => (
              <tr key={c.id} className="border-t">
                <td className="p-3">{c.email}</td>
                <td className="p-3">{c.first_name}</td>
                <td className="p-3">{c.last_name}</td>
                {customFields.map(field => (
                  <td key={field} className="p-3">{c.custom_fields?.[field] || ''}</td>
                ))}
              </tr>
            ))}
            {contacts.length === 0 && (
              <tr><td className="p-3 text-gray-500" colSpan={3 + customFields.length}>No contacts yet.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}