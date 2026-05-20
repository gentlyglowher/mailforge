'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Card from '@/components/Card'

type Step = {
  type: 'email' | 'wait'
  subject?: string
  body?: string
  wait_hours?: number
}

type Sequence = {
  id: string
  name: string
  steps: Step[]
}

export default function EditSequencePage() {
  const params = useParams()
  const seqId = params.id as string
  const router = useRouter()

  const [sequence, setSequence] = useState<Sequence | null>(null)
  const [name, setName] = useState('')
  const [steps, setSteps] = useState<Step[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchSequence = async () => {
      const res = await fetch(`/api/sequences/${seqId}`)
      if (res.ok) {
        const data = await res.json()
        setSequence(data)
        setName(data.name)
        setSteps(data.steps || [])
      }
    }
    fetchSequence()
  }, [seqId])

  const addStep = (type: 'email' | 'wait') => {
    setSteps([...steps, { type }])
  }

  const updateStep = (index: number, field: string, value: any) => {
    const newSteps = [...steps]
    newSteps[index] = { ...newSteps[index], [field]: value }
    setSteps(newSteps)
  }

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index))
  }

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newSteps = [...steps]
    if (direction === 'up' && index > 0) {
      [newSteps[index - 1], newSteps[index]] = [newSteps[index], newSteps[index - 1]]
    } else if (direction === 'down' && index < steps.length - 1) {
      [newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]]
    }
    setSteps(newSteps)
  }

  const handleSave = async () => {
    setSaving(true)
    const res = await fetch(`/api/sequences/${seqId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, steps }),
    })
    if (res.ok) {
      alert('Sequence updated!')
      router.push('/sequences')
    } else {
      alert('Failed to update sequence')
    }
    setSaving(false)
  }

  if (!sequence) return <div className="p-8">Loading...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Edit Sequence</h1>
        <button onClick={() => router.push('/sequences')} className="text-indigo-600 hover:underline">
          ← Back to sequences
        </button>
      </div>

      <Card className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Sequence Name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-indigo-500"
        />
      </Card>

      <Card className="mb-6">
        <h2 className="font-semibold mb-3">Steps</h2>
        {steps.length === 0 && (
          <p className="text-sm text-gray-500 mb-3">No steps yet. Add one below.</p>
        )}
        <div className="space-y-3">
          {steps.map((step, idx) => (
            <div key={idx} className="flex items-start gap-2 border p-3 rounded">
              <div className="flex flex-col items-center gap-1 mr-2">
                <button
                  type="button"
                  onClick={() => moveStep(idx, 'up')}
                  className="text-xs text-gray-500 hover:text-gray-700"
                  disabled={idx === 0}
                >
                  ▲
                </button>
                <span className="text-xs text-gray-400">{idx + 1}</span>
                <button
                  type="button"
                  onClick={() => moveStep(idx, 'down')}
                  className="text-xs text-gray-500 hover:text-gray-700"
                  disabled={idx === steps.length - 1}
                >
                  ▼
                </button>
              </div>

              <div className="flex-1 flex gap-2 items-start">
                <select
                  value={step.type}
                  onChange={e => updateStep(idx, 'type', e.target.value)}
                  className="border p-2 rounded text-sm"
                >
                  <option value="email">Email</option>
                  <option value="wait">Wait</option>
                </select>

                {step.type === 'email' ? (
                  <>
                    <input
                      type="text"
                      placeholder="Subject"
                      value={step.subject || ''}
                      onChange={e => updateStep(idx, 'subject', e.target.value)}
                      className="flex-1 border p-2 rounded"
                    />
                    <textarea
                      placeholder="Body"
                      value={step.body || ''}
                      onChange={e => updateStep(idx, 'body', e.target.value)}
                      className="flex-1 border p-2 rounded"
                      rows={2}
                    />
                  </>
                ) : (
                  <input
                    type="number"
                    placeholder="Hours"
                    value={step.wait_hours || ''}
                    onChange={e => updateStep(idx, 'wait_hours', parseInt(e.target.value))}
                    className="w-24 border p-2 rounded"
                  />
                )}
                <button
                  type="button"
                  onClick={() => removeStep(idx)}
                  className="text-red-500 text-sm"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={() => addStep('email')}
            className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
          >
            + Email
          </button>
          <button
            type="button"
            onClick={() => addStep('wait')}
            className="bg-gray-500 text-white px-3 py-1 rounded text-sm"
          >
            + Wait
          </button>
        </div>
      </Card>

      <button
        onClick={handleSave}
        disabled={saving}
        className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  )
}