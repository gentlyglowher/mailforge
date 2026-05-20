'use client'

import { useEffect, useState } from 'react'
import Card from '@/components/Card'

type UnsubscribeConfig = {
  headline?: string
  message?: string
  imageUrl?: string
}

export default function SettingsPage() {
  const [config, setConfig] = useState<UnsubscribeConfig>({
    headline: 'Unsubscribe',
    message: 'You have been successfully unsubscribed.',
    imageUrl: '',
  })
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.unsubscribe_config) setConfig(data.unsubscribe_config)
      })
  }, [])

  const saveConfig = async () => {
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unsubscribe_config: config }),
    })
    alert('Settings saved.')
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    // On utilise une route d'upload dédiée (on peut créer une route générique pour settings)
    const res = await fetch('/api/settings/upload-image', {
      method: 'POST',
      body: formData,
    })
    if (res.ok) {
      const data = await res.json()
      setConfig({ ...config, imageUrl: data.url })
    } else {
      alert('Upload failed')
    }
    setUploading(false)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Settings</h1>

      <Card className="mb-6">
        <h2 className="font-semibold mb-2">Unsubscribe Page</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Headline</label>
            <input
              type="text"
              value={config.headline || ''}
              onChange={e => setConfig({ ...config, headline: e.target.value })}
              className="w-full border p-2 rounded text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Message (shown after unsub)</label>
            <textarea
              value={config.message || ''}
              onChange={e => setConfig({ ...config, message: e.target.value })}
              className="w-full border p-2 rounded text-gray-900"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Image</label>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={config.imageUrl || ''}
                onChange={e => setConfig({ ...config, imageUrl: e.target.value })}
                className="flex-1 border p-2 rounded text-gray-900"
                placeholder="https://... or upload"
              />
              <span className="text-gray-400">or</span>
              <label className="cursor-pointer bg-gray-200 px-4 py-2 rounded hover:bg-gray-300 text-sm">
                {uploading ? 'Uploading...' : 'Upload'}
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
              </label>
            </div>
            {config.imageUrl && (
              <img src={config.imageUrl} alt="Preview" className="mt-2 h-32 rounded object-cover" />
            )}
          </div>
        </div>
        <button onClick={saveConfig} className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-500">
          Save Settings
        </button>
      </Card>
    </div>
  )
}