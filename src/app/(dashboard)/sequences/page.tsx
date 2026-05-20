'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Step = {
  type: 'email' | 'wait'
  subject?: string
  body?: string
  wait_hours?: number
}

type Sequence = {
  id: string
  name: string
  active: boolean
  created_at: string
}

export default function SequencesPage() {
  const [sequences, setSequences] = useState<Sequence[]>([])
  const [name, setName] = useState('')
  const [steps, setSteps] = useState<Step[]>([])

  const fetchSequences = async () => {
    const res = await fetch('/api/sequences')
    if (res.ok) setSequences(await res.json())
  }

  useEffect(() => { fetchSequences() }, [])

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

  const createSequence = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/sequences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, steps }),
    })
    if (res.ok) {
      fetchSequences()
      setName(''); setSteps([])
    } else {
      alert('Error creating sequence')
    }
  }

  const deleteSequence = async (id: string) => {
    await fetch(`/api/sequences/${id}`, { method: 'DELETE' })
    fetchSequences()
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Email Sequences</h1>

      <form onSubmit={createSequence} className="bg-white p-4 rounded shadow mb-6 space-y-3">
        <input
          type="text"
          placeholder="Sequence name"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full border p-2 rounded"
          required
        />

        <div className="space-y-2">
          {steps.map((step, idx) => (
            <div key={idx} className="flex gap-2 items-start border p-2 rounded">
              <span className="text-sm font-semibold w-16">{step.type === 'email' ? 'Email' : 'Wait'}</span>
              {step.type === 'email' ? (
                <>
                  <input
                    type="text"
                    placeholder="Subject"
                    value={step.subject || ''}
                    onChange={e => updateStep(idx, 'subject', e.target.value)}
                    className="flex-1 border p-1 rounded"
                  />
                  <textarea
                    placeholder="Body"
                    value={step.body || ''}
                    onChange={e => updateStep(idx, 'body', e.target.value)}
                    className="flex-1 border p-1 rounded"
                    rows={2}
                  />
                </>
              ) : (
                <input
                  type="number"
                  placeholder="Hours to wait"
                  value={step.wait_hours || ''}
                  onChange={e => updateStep(idx, 'wait_hours', parseInt(e.target.value))}
                  className="flex-1 border p-1 rounded"
                />
              )}
              <button type="button" onClick={() => removeStep(idx)} className="text-red-500">X</button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={() => addStep('email')} className="bg-blue-500 text-white px-3 py-1 rounded">+ Email</button>
          <button type="button" onClick={() => addStep('wait')} className="bg-gray-500 text-white px-3 py-1 rounded">+ Wait</button>
        </div>

        <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-500">
          Create Sequence
        </button>
      </form>

      <div className="space-y-4">
        {sequences.map(seq => (
          <div key={seq.id} className="bg-white p-4 rounded shadow flex justify-between items-center">
            <div>
              <p className="font-semibold">{seq.name}</p>
              <p className="text-sm text-gray-500">Created {new Date(seq.created_at).toLocaleDateString()}</p>
            </div>
            <div className="flex gap-2">
              <Link href={`/sequences/${seq.id}`} className="text-indigo-600 hover:underline">Manage</Link>
              <button onClick={() => deleteSequence(seq.id)} className="text-red-600">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}