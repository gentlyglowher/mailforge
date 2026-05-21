'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Card from '@/components/Card'
import EmailBuilder from '@/components/EmailBuilder'

type Campaign = {
  id: string
  name: string
  subject: string
  status: string
  scheduled_at: string | null
  created_at: string
  is_ab_test: boolean
  ab_test_status: string | null
  winning_variant: string | null
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [lists, setLists] = useState<any[]>([])
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [listId, setListId] = useState('')
  const [schedule, setSchedule] = useState('')

  // A/B test states
  const [isAbTest, setIsAbTest] = useState(false)
  const [variantASubject, setVariantASubject] = useState('')
  const [variantABody, setVariantABody] = useState('')
  const [variantBSubject, setVariantBSubject] = useState('')
  const [variantBBody, setVariantBBody] = useState('')
  const [testSampleSize, setTestSampleSize] = useState(20)
  const [winnerDelayHours, setWinnerDelayHours] = useState(4)

  const [showBuilder, setShowBuilder] = useState(false)

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

  const createCampaign = async (e: React.FormEvent, sendNow: boolean = false) => {
    e.preventDefault()
    const scheduledAt = schedule ? new Date(schedule).toISOString() : null
    const payload: any = {
      name,
      subject,
      body,
      list_id: listId,
      scheduled_at: scheduledAt,
      is_ab_test: isAbTest,
    }
    if (isAbTest) {
      payload.variant_a_subject = variantASubject || subject
      payload.variant_a_body = variantABody || body
      payload.variant_b_subject = variantBSubject || subject
      payload.variant_b_body = variantBBody || body
      payload.test_sample_size = testSampleSize
      payload.winner_delay_hours = winnerDelayHours
    }

    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      const campaign = await res.json()
      if (sendNow) {
        await fetch(`/api/campaigns/${campaign.id}`, { method: 'PATCH' })
      }
      fetchCampaigns()
      resetForm()
    } else {
      alert('Error creating campaign')
    }
  }

  const resetForm = () => {
    setName(''); setSubject(''); setBody(''); setListId(''); setSchedule('')
    setIsAbTest(false)
    setVariantASubject(''); setVariantABody('')
    setVariantBSubject(''); setVariantBBody('')
    setTestSampleSize(20); setWinnerDelayHours(4)
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

  const resendToNonOpeners = async (campaignId: string) => {
    const newSubject = prompt('Enter a new subject for the resend:', '')
    if (!newSubject) return
    const res = await fetch(`/api/campaigns/${campaignId}/resend-non-openers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: newSubject }),
    })
    if (res.ok) {
      alert('Resend queued!')
      fetchCampaigns()
    } else {
      alert('Failed to resend')
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Campaigns</h1>

      <Card className="mb-6">
        <form onSubmit={(e) => createCampaign(e, false)} className="space-y-3">
          <input type="text" placeholder="Campaign name" value={name} onChange={e => setName(e.target.value)} className="w-full border p-2 rounded" required />
          <input type="text" placeholder="Email subject" value={subject} onChange={e => setSubject(e.target.value)} className="w-full border p-2 rounded" required />

          {/* Body + Builder toggle */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-sm font-medium text-gray-700">Body (HTML)</label>
              <button type="button" onClick={() => setShowBuilder(!showBuilder)} className="text-sm text-indigo-600 hover:underline">
                {showBuilder ? 'Close Visual Builder' : 'Open Visual Builder'}
              </button>
            </div>
            {showBuilder ? (
              <div className="border rounded-lg overflow-hidden" style={{ height: '500px' }}>
                <EmailBuilder initialHtml={body} onSave={(html) => { setBody(html); setShowBuilder(false) }} onClose={() => setShowBuilder(false)} />
              </div>
            ) : (
              <textarea placeholder="Email body (HTML allowed, use {{first_name}} for personalization)" value={body} onChange={e => setBody(e.target.value)} rows={6} className="w-full border p-2 rounded" required />
            )}
          </div>

          <select value={listId} onChange={e => setListId(e.target.value)} className="w-full border p-2 rounded" required>
            <option value="">Select a list...</option>
            {lists.map(list => <option key={list.id} value={list.id}>{list.name}</option>)}
          </select>

          <input type="datetime-local" value={schedule} onChange={e => setSchedule(e.target.value)} className="w-full border p-2 rounded" />

          {/* A/B Test Toggle */}
          <div className="flex items-center gap-2">
            <input type="checkbox" id="abTest" checked={isAbTest} onChange={e => setIsAbTest(e.target.checked)} />
            <label htmlFor="abTest" className="text-sm font-medium">Enable A/B Test</label>
          </div>

          {isAbTest && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
              <div>
                <h3 className="font-semibold mb-2">Variant A</h3>
                <input placeholder="Subject A" value={variantASubject} onChange={e => setVariantASubject(e.target.value)} className="w-full border p-2 rounded mb-2" />
                <textarea placeholder="Body A (optional)" value={variantABody} onChange={e => setVariantABody(e.target.value)} className="w-full border p-2 rounded" rows={4} />
              </div>
              <div>
                <h3 className="font-semibold mb-2">Variant B</h3>
                <input placeholder="Subject B" value={variantBSubject} onChange={e => setVariantBSubject(e.target.value)} className="w-full border p-2 rounded mb-2" />
                <textarea placeholder="Body B (optional)" value={variantBBody} onChange={e => setVariantBBody(e.target.value)} className="w-full border p-2 rounded" rows={4} />
              </div>
              <div>
                <label className="text-sm">Test sample size (%)</label>
                <input type="number" value={testSampleSize} onChange={e => setTestSampleSize(parseInt(e.target.value))} className="w-full border p-2 rounded" />
              </div>
              <div>
                <label className="text-sm">Winner delay (hours)</label>
                <input type="number" value={winnerDelayHours} onChange={e => setWinnerDelayHours(parseInt(e.target.value))} className="w-full border p-2 rounded" />
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-500">Save Campaign</button>
            <button type="button" onClick={(e) => createCampaign(e, true)} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-500">Save &amp; Send Now</button>
          </div>
        </form>
      </Card>

      {/* Liste des campagnes */}
      <div className="space-y-4">
        {campaigns.map(c => (
          <Card key={c.id} className="flex justify-between items-center">
            <div>
              <Link href={`/campaigns/${c.id}`} className="font-semibold text-indigo-600 hover:underline">
                {c.name} – {c.subject}
              </Link>
              <p className="text-sm text-gray-500">
                Status: {c.status}{' '}
                {c.scheduled_at ? `(Scheduled: ${new Date(c.scheduled_at).toLocaleString()})` : ''}
                {c.is_ab_test && c.winning_variant && ` | Winner: Variant ${c.winning_variant}`}
              </p>
            </div>
            <div className="flex gap-2">
              {c.status === 'draft' && (
                <button onClick={() => sendNow(c.id)} className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-500">Send Now</button>
              )}
              {c.status === 'sent' && (
                <button onClick={() => resendToNonOpeners(c.id)} className="bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-500">Resend to non-openers</button>
              )}
              <button onClick={() => checkSpam(c.id)} className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-400">Spam Check</button>
              <button onClick={() => deleteCampaign(c.id)} className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-500">Delete</button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}