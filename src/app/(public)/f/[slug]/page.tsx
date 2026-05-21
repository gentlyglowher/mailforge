'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

type FunnelPage = {
  id: string
  type: string
  config: { html?: string; css?: string }
  list_id: string | null
}

type Funnel = {
  name: string
  pages: FunnelPage[]
}

export default function PublicFunnelPage() {
  const params = useParams()
  const slug = params.slug as string
  const [funnel, setFunnel] = useState<Funnel | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/public/funnel/${slug}`)
      .then(r => r.json())
      .then(data => {
        if (data.pages) setFunnel(data)
        setLoading(false)
      })
  }, [slug])

  // Move to the next page or external URL
  const goTo = (redirect: string | number | undefined) => {
    if (redirect === undefined || redirect === null) {
      // If no redirect, move to next page in funnel
      setCurrentStep(prev => prev + 1)
    } else if (typeof redirect === 'number') {
      setCurrentStep(redirect)
    } else if (typeof redirect === 'string' && redirect.startsWith('http')) {
      window.location.href = redirect
    } else {
      // treat as page index (string)
      const idx = parseInt(redirect, 10)
      if (!isNaN(idx)) setCurrentStep(idx)
      else setCurrentStep(prev => prev + 1)
    }
  }

  // Intercept form submits and button clicks
  useEffect(() => {
    if (!funnel || currentStep >= funnel.pages.length) return

    // Wait for the HTML to be injected
    const timer = setTimeout(() => {
      const pageDiv = document.getElementById('funnel-page-content')
      if (!pageDiv) return

      // Handle forms
      const forms = pageDiv.querySelectorAll('form[data-maillist]')
      forms.forEach(form => {
        form.addEventListener('submit', async (e) => {
          e.preventDefault()
          const listId = form.getAttribute('data-maillist') || funnel.pages[currentStep].list_id || ''
          const emailInput = form.querySelector('input[type="email"]') as HTMLInputElement
          const nameInput = form.querySelector('input[type="text"]') as HTMLInputElement
          if (!emailInput) return

          const redirectAttr = form.getAttribute('data-redirect') || undefined
          await fetch(`/api/public/funnel/${slug}/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: emailInput.value,
              first_name: nameInput?.value || '',
              list_id: listId,
              redirect: redirectAttr,
            }),
          })
          goTo(redirectAttr)
        })
      })

      // Handle buttons/links with data-list
      const buttons = pageDiv.querySelectorAll('[data-button]')
      buttons.forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.preventDefault()
          const listId = btn.getAttribute('data-list') || ''
          const redirectAttr = btn.getAttribute('data-redirect') || undefined
          // For a button, we might not have an email input, but we could still add to list if we know the contact? For simplicity, we just redirect
          goTo(redirectAttr)
        })
      })
    }, 100)

    return () => clearTimeout(timer)
  }, [currentStep, funnel, slug])

  if (loading) return <div className="flex min-h-screen items-center justify-center">Loading funnel...</div>
  if (!funnel) return <div className="flex min-h-screen items-center justify-center">Funnel not found.</div>
  if (currentStep >= funnel.pages.length) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-md text-center">
          <h1 className="text-2xl font-bold mb-4">Thank you!</h1>
          <p className="text-gray-600">You've completed the funnel.</p>
        </div>
      </div>
    )
  }

  const page = funnel.pages[currentStep]

  return (
    <div className="min-h-screen">
      <style>{page.config.css}</style>
      <div
        id="funnel-page-content"
        dangerouslySetInnerHTML={{ __html: page.config.html || '' }}
      />
    </div>
  )
}