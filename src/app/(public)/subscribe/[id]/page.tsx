'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

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

export default function SubscribePage() {
  const params = useParams()
  const id = params.id as string
  const [formConfig, setFormConfig] = useState<FormConfig>({})
  const [fields, setFields] = useState<CustomField[]>([])
  const [listName, setListName] = useState('')
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [customValues, setCustomValues] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    fetch(`/api/public/subscribe/${id}`)
      .then(res => res.json())
      .then(data => {
        setListName(data.listName)
        setFormConfig(data.formConfig)
        setFields(data.fields || [])
      })
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const res = await fetch(`/api/public/subscribe/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, first_name: firstName, last_name: lastName, ...customValues }),
    })
    if (res.ok) {
      setSubmitted(true)
    } else {
      const data = await res.json()
      setError(data.error || 'Something went wrong')
    }
  }

  if (submitted) {
    return (
      <div className="max-w-lg w-full bg-white p-8 rounded-xl shadow-md text-center">
        <h1 className="text-2xl font-bold mb-4">Thank You!</h1>
        <p className="text-gray-600">{formConfig.thankYouMessage || 'You have been subscribed.'}</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg w-full">
      {formConfig.imageUrl && (
        <img src={formConfig.imageUrl} alt="Header" className="w-full rounded-t-xl h-48 object-cover" />
      )}
      <div className="bg-white p-8 rounded-b-xl shadow-md">
        <h1 className="text-3xl font-bold mb-2">{formConfig.headline || listName}</h1>
        {formConfig.subHeadline && <p className="text-gray-500 mb-6">{formConfig.subHeadline}</p>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email *</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full border p-2 rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">First Name</label>
            <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full border p-2 rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Last Name</label>
            <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full border p-2 rounded" />
          </div>
          
          {fields.map(field => (
            <div key={field.field_name}>
              <label className="block text-sm font-medium text-gray-700">
                {field.field_name} {field.required && '*'}
              </label>
              <input
                type="text"
                required={field.required}
                value={customValues[field.field_name] || ''}
                onChange={e => setCustomValues({ ...customValues, [field.field_name]: e.target.value })}
                className="w-full border p-2 rounded"
              />
            </div>
          ))}

          {error && <p className="text-red-500 text-sm">{error}</p>}
          
          <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700">
            Subscribe
          </button>
        </form>
      </div>
    </div>
  )
}