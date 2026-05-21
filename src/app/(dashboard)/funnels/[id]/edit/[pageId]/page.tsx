'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Editor, Frame, Element, useNode, useEditor } from '@craftjs/core'
import { Layers } from '@craftjs/layers'
import lz from 'lzutf8'

// ---------------------- Block components ----------------------

// Text block (editable content)
const TextBlock = ({ text = 'Your text here', color = '#000000', fontSize = '16' }) => {
  const { connectors: { connect, drag }, actions: { setProp } } = useNode()
  const [editable, setEditable] = useState(false)
  return (
    <div ref={ref => connect(drag(ref))} className="p-2 cursor-move relative">
      {editable ? (
        <div
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => {
            setProp(props => props.text = e.target.innerText)
            setEditable(false)
          }}
          dangerouslySetInnerHTML={{ __html: text }}
          style={{ color, fontSize: `${fontSize}px` }}
          className="outline-none"
        />
      ) : (
        <div onClick={() => setEditable(true)} style={{ color, fontSize: `${fontSize}px` }} className="cursor-text">
          {text}
        </div>
      )}
    </div>
  )
}

// Image block
const ImageBlock = ({ src = 'https://via.placeholder.com/400', alt = '' }) => {
  const { connectors: { connect, drag } } = useNode()
  return (
    <div ref={ref => connect(drag(ref))} className="p-2 cursor-move">
      <img src={src} alt={alt} className="max-w-full h-auto" />
    </div>
  )
}

// Video block (YouTube embed)
const VideoBlock = ({ youtubeUrl = 'https://www.youtube.com/embed/dQw4w9WgXcQ' }) => {
  const { connectors: { connect, drag } } = useNode()
  const getEmbedUrl = (url: string) => {
    const match = url.match(/v=([^&]+)/)
    return match ? `https://www.youtube.com/embed/${match[1]}` : url
  }
  return (
    <div ref={ref => connect(drag(ref))} className="p-2 cursor-move">
      <iframe width="100%" height="315" src={getEmbedUrl(youtubeUrl)} allowFullScreen className="max-w-full" />
    </div>
  )
}

// Form block
const FormBlock = ({ listId = '', redirect = '' }) => {
  const { connectors: { connect, drag } } = useNode()
  const [lists, setLists] = useState<any[]>([])
  useEffect(() => {
    fetch('/api/lists').then(r => r.json()).then(setLists)
  }, [])
  return (
    <div ref={ref => connect(drag(ref))} className="p-4 border rounded bg-white cursor-move">
      <form data-maillist={listId} data-redirect={redirect}>
        <input type="email" placeholder="Email" required className="w-full border p-2 mb-2 rounded" />
        <input type="text" placeholder="First Name" className="w-full border p-2 mb-2 rounded" />
        <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">Submit</button>
      </form>
      <div className="mt-2 text-xs text-gray-500">
        List: {lists.find(l => l.id === listId)?.name || 'None'} | Redirect: {redirect || 'Next page'}
      </div>
    </div>
  )
}

// Button block
const ButtonBlock = ({ text = 'Click Me', url = '#', listId = '', redirect = '' }) => {
  const { connectors: { connect, drag } } = useNode()
  const [lists, setLists] = useState<any[]>([])
  useEffect(() => {
    fetch('/api/lists').then(r => r.json()).then(setLists)
  }, [])
  return (
    <div ref={ref => connect(drag(ref))} className="p-2 cursor-move inline-block">
      <a
        href={url}
        data-list={listId}
        data-redirect={redirect}
        className="inline-block bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 no-underline"
      >
        {text}
      </a>
      <div className="text-xs text-gray-500 mt-1">
        {listId && <>List: {lists.find(l => l.id === listId)?.name || listId}</>}
        {redirect && <> | Redirect: {redirect}</>}
      </div>
    </div>
  )
}

// ---------------------- Settings panel ----------------------
const SettingsPanel = () => {
  const { selected } = useEditor((state) => {
    const selectedNodeId = state.events.selected?.values().next().value
    return { selected: selectedNodeId ? state.nodes[selectedNodeId] : null }
  })

  if (!selected || !selected.data) return <div className="p-4 text-gray-500">Select a block to edit</div>

  const { props, displayName } = selected.data

  return (
    <div className="p-4 space-y-3">
      <h3 className="font-semibold">{displayName}</h3>
      {Object.entries(props).map(([key, value]) => {
        if (key === 'listId' || key === 'redirect') return null // will handle separately
        return (
          <div key={key}>
            <label className="text-sm">{key}</label>
            <input
              type="text"
              value={value as string}
              onChange={e => selected.setProp(key, e.target.value)}
              className="w-full border p-2 rounded"
            />
          </div>
        )
      })}

      {/* Special fields for form/button list & redirect */}
      {(displayName === 'FormBlock' || displayName === 'ButtonBlock') && (
        <>
          <div>
            <label className="text-sm">List ID</label>
            <input
              type="text"
              value={props.listId || ''}
              onChange={e => selected.setProp('listId', e.target.value)}
              className="w-full border p-2 rounded"
              placeholder="Enter list ID"
            />
          </div>
          <div>
            <label className="text-sm">Redirect (page index or URL)</label>
            <input
              type="text"
              value={props.redirect || ''}
              onChange={e => selected.setProp('redirect', e.target.value)}
              className="w-full border p-2 rounded"
              placeholder="e.g., 1 or https://..."
            />
          </div>
        </>
      )}
    </div>
  )
}

// ---------------------- Main editor component ----------------------
export default function CraftPageEditor() {
  const params = useParams()
  const funnelId = params.id as string
  const pageId = params.pageId as string
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [initialJson, setInitialJson] = useState<any>(null)
  const editorRef = useRef<any>(null)

  // Load page data
  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/funnels/${funnelId}`)
      const funnel = await res.json()
      const page = funnel.pages?.find((p: any) => p.id === pageId)
      if (!page) {
        alert('Page not found')
        router.back()
        return
      }
      const config = page.config || {}
      setInitialJson(config.json || null)
      setLoading(false)
    }
    load()
  }, [funnelId, pageId])

  const handleSave = async () => {
    // Use the editor's state to get the JSON
    const json = editorRef.current?.query?.serialize() || initialJson
    const res = await fetch(`/api/funnels/${funnelId}/pages/${pageId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: { json } }),
    })
    if (res.ok) {
      alert('Page saved!')
      router.back()
    } else {
      alert('Save failed')
    }
  }

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="h-screen flex flex-col">
      <div className="flex justify-between items-center p-4 bg-gray-100 border-b">
        <h1 className="text-xl font-bold">Page Builder</h1>
        <div className="flex gap-2">
          <button onClick={handleSave} className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-500">Save & Close</button>
          <button onClick={() => router.back()} className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300">Cancel</button>
        </div>
      </div>

      <Editor
        resolver={{ TextBlock, ImageBlock, VideoBlock, FormBlock, ButtonBlock }}
        onNodesChange={(query) => { editorRef.current = query }}
        enabled={false} // we'll set to true after load
        initialState={initialJson}
      >
        <div className="flex flex-1 overflow-hidden">
          {/* Block palette */}
          <div className="w-48 bg-gray-50 border-r p-4 space-y-2">
            <p className="font-semibold text-sm mb-2">Blocks</p>
            <Element is={TextBlock} text="New text" canvas />
            <Element is={ImageBlock} canvas />
            <Element is={VideoBlock} canvas />
            <Element is={FormBlock} canvas />
            <Element is={ButtonBlock} canvas />
          </div>

          {/* Main canvas */}
          <div className="flex-1 bg-white p-8 overflow-y-auto">
            <Frame>
              <Element is="div" canvas>
                {/* initial content will be loaded from JSON */}
              </Element>
            </Frame>
          </div>

          {/* Settings panel */}
          <div className="w-64 bg-gray-50 border-l overflow-y-auto">
            <SettingsPanel />
          </div>
        </div>
      </Editor>
    </div>
  )
}