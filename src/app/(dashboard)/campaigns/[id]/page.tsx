'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Card from '@/components/Card'

type Campaign = {
  id: string
  name: string
  subject: string
  body: string
  list_id: string
  status: string
}





export default function CampaignDetailPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [name, setName] = useState('')
  const [spamResult, setSpamResult] = useState('')
  const [spamLoading, setSpamLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    fetchCampaign()
  }, [])


  function SpamReport({ data }: { data: any }) {
    if (!data) return null

    const { score, issues = [], suggestions = [], raw } = data

    // Si on a du raw et aucune donnée structurée, on affiche la réponse brute dans un bloc
    if (raw && issues.length === 0 && suggestions.length === 0 && (score === undefined || score === 0)) {
        return (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm font-semibold text-gray-700 mb-2">AI raw response (JSON parsing failed)</p>
            <pre className="text-xs text-gray-600 whitespace-pre-wrap">{raw}</pre>
        </div>
        )
    }

    // Déterminer la couleur en fonction du score
    let scoreColor = 'text-green-600'
    let bgBar = 'bg-green-500'
    if (score >= 7) {
        scoreColor = 'text-red-600'
        bgBar = 'bg-red-500'
    } else if (score >= 4) {
        scoreColor = 'text-yellow-600'
        bgBar = 'bg-yellow-500'
    }

    return (
        <div className="space-y-4">
        {/* Jauge de score */}
        <div>
            <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium text-gray-700">Spam Score</span>
            <span className={`text-lg font-bold ${scoreColor}`}>{score}/10</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
            <div
                className={`h-3 rounded-full transition-all duration-500 ${bgBar}`}
                style={{ width: `${(score / 10) * 100}%` }}
            ></div>
            </div>
        </div>

        {/* Problèmes détectés */}
        {issues.length > 0 && (
            <div>
            <h3 className="text-sm font-semibold text-red-700 mb-1">Issues Found</h3>
            <ul className="list-disc pl-5 text-sm text-gray-800 space-y-1">
                {issues.map((issue: string, i: number) => (
                <li key={i}>{issue}</li>
                ))}
            </ul>
            </div>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && (
            <div>
            <h3 className="text-sm font-semibold text-indigo-700 mb-1">Suggestions</h3>
            <ul className="list-disc pl-5 text-sm text-gray-800 space-y-1">
                {suggestions.map((s: string, i: number) => (
                <li key={i}>{s}</li>
                ))}
            </ul>
            </div>
        )}

        {issues.length === 0 && suggestions.length === 0 && (
            <p className="text-sm text-green-700">No issues detected. Your email looks good!</p>
        )}
        </div>
    )
  }

  const fetchCampaign = async () => {
    const res = await fetch(`/api/campaigns/${id}`)
    if (res.ok) {
      const data = await res.json()
      setCampaign(data)
      setName(data.name)
      setSubject(data.subject)
      setBody(data.body)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    // We need a PUT/PATCH endpoint for updating campaign. Let's create one quickly.
    const res = await fetch(`/api/campaigns/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, subject, body }),
    })
    if (res.ok) {
      alert('Campaign updated')
    } else {
      alert('Failed to save')
    }
    setSaving(false)
  }

  const handleSpamCheck = async () => {
    setSpamLoading(true)
    const res = await fetch('/api/ai/spam-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, body }),
    })
    if (res.ok) {
      const data = await res.json()
      setSpamResult(data.result)
    } else {
      setSpamResult('Error during spam check.')
    }
    setSpamLoading(false)
  }

  const fetchStats = async () => {
    const res = await fetch(`/api/campaigns/${id}/stats`)
    if (res.ok) setStats(await res.json())
  }

  // Call fetchStats after loading campaign (inside useEffect or separate)
  useEffect(() => {
    fetchCampaign()
    fetchStats()
  }, [])
  
  if (!campaign) return <div className="p-8">Loading...</div>



  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Edit Campaign</h1>
        <button onClick={() => router.push('/campaigns')} className="text-indigo-600 hover:underline">
          ← Back to campaigns
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4 text-center">
            <p className="text-sm text-gray-500">Sent</p>
            <p className="text-2xl font-bold">{stats.sent}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-sm text-gray-500">Opened (unique)</p>
            <p className="text-2xl font-bold">{stats.uniqueOpens}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-sm text-gray-500">Clicked (unique)</p>
            <p className="text-2xl font-bold">{stats.uniqueClicks}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-sm text-gray-500">Bounces</p>
            <p className="text-2xl font-bold">{stats.bounces}</p>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: editor */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </Card>

          <Card>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </Card>

          <Card>
            <label className="block text-sm font-medium text-gray-700 mb-1">Body (HTML)</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={12}
              className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <p className="text-xs text-gray-500 mt-2">
              Use {'{{first_name}}'} and {'{{last_name}}'} for personalization.
            </p>
          </Card>

          <div className="flex space-x-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={() => {/* send logic could be added, but we already have Send Now in the list; maybe reuse PATCH */}}
              className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              Send Now
            </button>
          </div>
        </div>

        {/* Right: Spam check panel */}
        <div className="space-y-6">
          <Card>
            <h2 className="text-lg font-semibold mb-3">Spam Analysis</h2>
            <button
              onClick={handleSpamCheck}
              disabled={spamLoading}
              className="w-full bg-yellow-500 text-white px-4 py-3 rounded-lg font-semibold hover:bg-yellow-600 transition-colors disabled:opacity-50"
            >
              {spamLoading ? 'Analyzing...' : 'Run Spam Check'}
            </button>

            <div className="mt-4">
                {spamResult ? <SpamReport data={spamResult} /> : (
                    <p className="text-sm text-gray-500">Click to analyze the email for spam triggers.</p>
                )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}