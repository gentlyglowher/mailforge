'use client'

import { useEffect, useRef, useState } from 'react'
import grapesjs, { Editor } from 'grapesjs'
import 'grapesjs/dist/css/grapes.min.css'
import newsletter from 'grapesjs-preset-newsletter'

interface EmailBuilderProps {
  initialHtml?: string
  onSave: (html: string) => void
  onClose?: () => void
}

export default function EmailBuilder({ initialHtml = '', onSave, onClose }: EmailBuilderProps) {
  const editorRef = useRef<Editor | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!containerRef.current || editorRef.current) return

    const editor = grapesjs.init({
      container: containerRef.current,
      height: '100%',
      width: 'auto',
      storageManager: false, // we manage saving manually
      plugins: [newsletter],
      pluginsOpts: {
        [newsletter as any]: {},
      },
      canvas: {
        styles: [
          'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap',
        ],
      },
    })

    editor.on('load', () => {
      if (initialHtml) {
        editor.setComponents(initialHtml)
      }
      setReady(true)
    })

    editorRef.current = editor

    return () => {
      editor.destroy()
      editorRef.current = null
    }
  }, [])

  const handleSave = () => {
    if (editorRef.current) {
      const html = editorRef.current.getHtml()
      const css = editorRef.current.getCss()
      // Combine HTML and inline CSS for email
      const fullHtml = `<html><head><style>${css}</style></head><body>${html}</body></html>`
      onSave(fullHtml)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center p-4 bg-gray-100 border-b">
        <h2 className="text-lg font-semibold">Email Builder</h2>
        <div className="flex gap-2">
          {onClose && (
            <button onClick={onClose} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">
              Cancel
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!ready}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            Save & Apply
          </button>
        </div>
      </div>
      <div ref={containerRef} className="flex-1" style={{ minHeight: '500px' }} />
    </div>
  )
}