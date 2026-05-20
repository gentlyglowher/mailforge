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

type CustomField = {
  field_name: string
  required: boolean
}

type FormConfig = {
  headline?: string
  subHeadline?: string
  imageUrl?: string
  thankYouMessage?: string
}

export default function ListDetailPage() {
  const params = useParams()
  const listId = params.id as string
  const [contacts, setContacts] = useState<Contact[]>([])
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [csvText, setCsvText] = useState('')
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [newFieldName, setNewFieldName] = useState('')
  const [customValues, setCustomValues] = useState<Record<string, string>>({})
  const [uploading, setUploading] = useState(false)

  // Form configuration state
  const [formConfig, setFormConfig] = useState<FormConfig>({
    headline: '',
    subHeadline: '',
    imageUrl: '',
    thankYouMessage: 'Thank you for subscribing!',
  })
  const [formUrl, setFormUrl] = useState('')

  const fetchContacts = async () => {
    const res = await fetch(`/api/lists/${listId}/contacts`)
    if (res.ok) setContacts(await res.json())
  }

  const fetchCustomFields = async () => {
    const res = await fetch(`/api/lists/${listId}/fields`)
    if (res.ok) setCustomFields(await res.json())
  }

  const fetchFormConfig = async () => {
    const res = await fetch(`/api/lists/${listId}/form-config`)
    if (res.ok) {
      const config = await res.json()
      setFormConfig(config)
    }
  }

  useEffect(() => {
    fetchContacts()
    fetchCustomFields()
    fetchFormConfig()
    setFormUrl(`${window.location.origin}/subscribe/${listId}`)
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch(`/api/lists/${listId}/upload-image`, {
      method: 'POST',
      body: formData,
    })
    if (res.ok) {
      const data = await res.json()
      setFormConfig({ ...formConfig, imageUrl: data.url })
    } else {
      alert('Upload failed')
    }
    setUploading(false)
  }

  const addCustomField = async () => {
    if (!newFieldName.trim()) return
    await fetch(`/api/lists/${listId}/fields`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field_name: newFieldName.trim(), required: false }),
    })
    setNewFieldName('')
    fetchCustomFields()
  }

  const toggleRequired = async (fieldName: string, required: boolean) => {
    await fetch(`/api/lists/${listId}/fields`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field_name: fieldName, required }),
    })
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

  const saveFormConfig = async () => {
    await fetch(`/api/lists/${listId}/form-config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formConfig),
    })
    alert('Form configuration saved.')
  }

  const copyFormUrl = () => {
    navigator.clipboard.writeText(formUrl)
    alert('Form URL copied!')
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Contacts in List</h1>

      {/* Public Subscription Form Configuration */}
      <Card className="mb-6">
        <h2 className="font-semibold mb-2">Public Subscription Form</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Headline</label>
            <input
              type="text"
              value={formConfig.headline || ''}
              onChange={e => setFormConfig({ ...formConfig, headline: e.target.value })}
              className="w-full border p-2 rounded text-gray-900"
              placeholder="Join our newsletter"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Sub-Headline</label>
            <input
              type="text"
              value={formConfig.subHeadline || ''}
              onChange={e => setFormConfig({ ...formConfig, subHeadline: e.target.value })}
              className="w-full border p-2 rounded text-gray-900"
              placeholder="Get weekly updates..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Header Image</label>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={formConfig.imageUrl || ''}
                onChange={e => setFormConfig({ ...formConfig, imageUrl: e.target.value })}
                className="flex-1 border p-2 rounded text-gray-900"
                placeholder="https://example.com/banner.jpg (or upload)"
              />
              <span className="text-gray-400">or</span>
              <label className="cursor-pointer bg-gray-200 px-4 py-2 rounded hover:bg-gray-300 text-sm">
                {uploading ? 'Uploading...' : 'Upload'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
            {formConfig.imageUrl && (
              <img src={formConfig.imageUrl} alt="Preview" className="mt-2 h-32 rounded object-cover" />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Thank You Message</label>
            <textarea
              value={formConfig.thankYouMessage || ''}
              onChange={e => setFormConfig({ ...formConfig, thankYouMessage: e.target.value })}
              className="w-full border p-2 rounded text-gray-900"
              rows={3}
              placeholder="Thank you for subscribing!"
            />
          </div>
        </div>
        <button onClick={saveFormConfig} className="mt-3 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-500">
          Save Form Config
        </button>
        <div className="mt-4 flex items-center gap-2">
          <strong>Form URL:</strong>
          <code className="bg-gray-100 p-2 rounded text-sm break-all">{formUrl}</code>
          <button onClick={copyFormUrl} className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300 text-sm">Copy</button>
        </div>
      </Card>

      {/* Custom Fields Management */}
      <Card className="mb-6">
        <h2 className="font-semibold mb-2">Custom Fields for this List</h2>
        <div className="flex flex-wrap gap-2 mb-3">
          {customFields.map(field => (
            <span key={field.field_name} className="inline-flex items-center bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm">
              {field.field_name} {field.required ? '(required)' : '(optional)'}
              <button
                onClick={() => toggleRequired(field.field_name, !field.required)}
                className="ml-2 text-xs text-blue-600 hover:text-blue-800"
              >
                {field.required ? 'Set optional' : 'Set required'}
              </button>
              <button
                onClick={() => removeCustomField(field.field_name)}
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
            className="flex-1 border p-2 rounded text-gray-900"
          />
          <button onClick={addCustomField} className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-500">
            Add
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Use these as merge tags like {`{{fieldname}}`}. Required fields will be mandatory on the public form.
        </p>
      </Card>

      {/* Add single contact */}
      <Card className="mb-6">
        <form onSubmit={addContact} className="space-y-3">
          <h2 className="font-semibold">Add a Contact</h2>
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border p-2 rounded text-gray-900" required />
          <input type="text" placeholder="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full border p-2 rounded text-gray-900" />
          <input type="text" placeholder="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full border p-2 rounded text-gray-900" />
          {/* Dynamic custom fields */}
          {customFields.map(field => (
            <input
              key={field.field_name}
              type="text"
              placeholder={`${field.field_name}${field.required ? ' (required)' : ''}`}
              value={customValues[field.field_name] || ''}
              onChange={e => setCustomValues({ ...customValues, [field.field_name]: e.target.value })}
              className="w-full border p-2 rounded text-gray-900"
              required={field.required}
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
          className="w-full border p-2 rounded mt-2 text-gray-900"
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
                <th key={field.field_name} className="p-3 text-left capitalize">{field.field_name}</th>
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
                  <td key={field.field_name} className="p-3">{c.custom_fields?.[field.field_name] || ''}</td>
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