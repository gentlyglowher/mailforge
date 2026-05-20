'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Campaign = {
  id: string
  name: string
  subject: string
  status: string
  scheduled_at: string | null
  created_at: string
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [lists, setLists] = useState<any[]>([])
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [listId, setListId] = useState('')
  const [schedule, setSchedule] = useState('')

  const fetchCampaigns = async () => {
    const res = await fetch('/api/campaigns')
    if (res.ok) setCampaigns(await res.json())
  }

  const fetchLists = async () => {
    const res = await fetch('/api/lists')
    if (res.ok) setLists(await res.json())
  }

  useEffect(() => {
    fetchCampaigns()
    fetchLists()
  }, [])

  const createCampaign = async (e: React.FormEvent) => {
    e.preventDefault()
    const scheduledAt = schedule ? new Date(schedule).toISOString() : null
    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, subject, body, list_id: listId, scheduled_at: scheduledAt }),
    })
    if (res.ok) {
      fetchCampaigns()
      setName(''); setSubject(''); setBody(''); setListId(''); setSchedule('')
    } else {
      alert('Error creating campaign')
    }
  }

  const sendNow = async (id: string) => {
    const confirmed = confirm('Send this campaign immediately?')
    if (!confirmed) return
    await fetch(`/api/campaigns/${id}`, { method: 'PATCH' })
    fetchCampaigns()
  }

  const deleteCampaign = async (id: string) => {
    await fetch(`/api/campaigns/${id}`, { method: 'DELETE' })
    fetchCampaigns()
  }

  const checkSpam = async (id: string) => {
    const res = await fetch(`/api/campaigns/${id}`)
    if (!res.ok) return alert('Campaign not found')
    const campaign = await res.json()
    const spamRes = await fetch('/api/ai/spam-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: campaign.subject, body: campaign.body }),
    })
    const data = await spamRes.json()
    alert(`Spam Analysis:\n${data.result}`)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Campaigns</h1>

      <form onSubmit={createCampaign} className="bg-white p-4 rounded shadow mb-6 space-y-3">
        <input type="text" placeholder="Campaign name" value={name} onChange={e => setName(e.target.value)} className="w-full border p-2 rounded" required />
        <input type="text" placeholder="Email subject" value={subject} onChange={e => setSubject(e.target.value)} className="w-full border p-2 rounded" required />
        <textarea placeholder="Email body (HTML allowed, use {{first_name}} for personalization)" value={body} onChange={e => setBody(e.target.value)} rows={6} className="w-full border p-2 rounded" required />
        <select value={listId} onChange={e => setListId(e.target.value)} className="w-full border p-2 rounded" required>
          <option value="">Select a list...</option>
          {lists.map(list => <option key={list.id} value={list.id}>{list.name}</option>)}
        </select>
        <input type="datetime-local" value={schedule} onChange={e => setSchedule(e.target.value)} className="w-full border p-2 rounded" />
        <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-500">
          Save Campaign
        </button>
      </form>

      <div className="space-y-4">
        {campaigns.map(c => (
          <div key={c.id} className="bg-white p-4 rounded shadow flex justify-between items-center">
            <div>
              <p className="font-semibold">{c.name} – {c.subject}</p>
              <p className="text-sm text-gray-500">Status: {c.status} {c.scheduled_at ? `(Scheduled: ${new Date(c.scheduled_at).toLocaleString()})` : ''}</p>
            </div>
            <div className="flex gap-2">
              {c.status === 'draft' && (
                <button onClick={() => sendNow(c.id)} className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-500">Send Now</button>
              )}
              <button
                onClick={() => checkSpam(c.id)}
                className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-400"
              >
                Spam Check
              </button>
              <button onClick={() => deleteCampaign(c.id)} className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-500">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}