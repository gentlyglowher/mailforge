'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

type UnsubscribeConfig = {
  headline?: string
  message?: string
  imageUrl?: string
}

function UnsubscribeContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email')
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [config, setConfig] = useState<UnsubscribeConfig>({})

  useEffect(() => {
    fetch('/api/public/unsubscribe-config')
      .then(res => res.json())
      .then(data => setConfig(data || {}))
  }, [])

  useEffect(() => {
    if (!email || !token) {
      setStatus('error')
      return
    }
    fetch(`/api/public/unsubscribe?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setStatus('success')
        else setStatus('error')
      })
  }, [email, token])

  return (
    <div className="max-w-md w-full">
      {config.imageUrl && (
        <img src={config.imageUrl} alt="Unsubscribe" className="w-full rounded-t-xl h-48 object-cover" />
      )}
      <div className="bg-white p-8 rounded-b-xl shadow-md text-center">
        {status === 'loading' && <p className="text-gray-500">Processing...</p>}
        {status === 'success' && (
          <>
            <h1 className="text-2xl font-bold mb-4">{config.headline || 'Unsubscribed'}</h1>
            <p className="text-gray-600">{config.message || 'You have been successfully unsubscribed.'}</p>
          </>
        )}
        {status === 'error' && (
          <>
            <h1 className="text-2xl font-bold mb-4">Error</h1>
            <p className="text-gray-600">Invalid or expired link.</p>
          </>
        )}
      </div>
    </div>
  )
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<div className="text-gray-500">Loading...</div>}>
      <UnsubscribeContent />
    </Suspense>
  )
}