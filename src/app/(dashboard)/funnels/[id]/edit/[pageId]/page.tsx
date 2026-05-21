'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ---------------------- Types ----------------------
type BlockType = 'TextBlock' | 'ImageBlock' | 'VideoBlock' | 'FormBlock' | 'ButtonBlock' | 'GridBlock'

interface BlockStyle {
  paddingTop?: string
  paddingRight?: string
  paddingBottom?: string
  paddingLeft?: string
  marginTop?: string
  marginRight?: string
  marginBottom?: string
  marginLeft?: string
  backgroundColor?: string
  border?: string
  borderRadius?: string
  [key: string]: string | undefined
}

interface GridCell {
  row: number
  col: number
  rowspan: number
  colspan: number
  blocks: Block[]
}

interface Block {
  id: string
  type: BlockType
  props: Record<string, any>
  style: BlockStyle
}

// ---------------------- Default style ----------------------
const defaultStyle: BlockStyle = {
  paddingTop: '0',
  paddingRight: '0',
  paddingBottom: '0',
  paddingLeft: '0',
  marginTop: '0',
  marginRight: '0',
  marginBottom: '0',
  marginLeft: '0',
  backgroundColor: 'transparent',
  border: 'none',
  borderRadius: '0',
}

const styleToString = (style: BlockStyle): React.CSSProperties => ({
  paddingTop: style.paddingTop || '0',
  paddingRight: style.paddingRight || '0',
  paddingBottom: style.paddingBottom || '0',
  paddingLeft: style.paddingLeft || '0',
  marginTop: style.marginTop || '0',
  marginRight: style.marginRight || '0',
  marginBottom: style.marginBottom || '0',
  marginLeft: style.marginLeft || '0',
  backgroundColor: style.backgroundColor || 'transparent',
  border: style.border || 'none',
  borderRadius: style.borderRadius || '0',
})

// ---------------------- Font list ----------------------
const FONT_OPTIONS = [
  'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana',
  'Courier New', 'Trebuchet MS', 'Comic Sans MS', 'Impact',
]

// ---------------------- Block content components ----------------------

function TextBlockContent({ block, selected, onSelect, onChange }: {
  block: Block; selected: boolean; onSelect: () => void; onChange: (props: Record<string, any>) => void
}) {
  const [editing, setEditing] = useState(false)
  return (
    <div onClick={onSelect} className="relative">
      {editing ? (
        <div
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => { onChange({ text: e.target.innerText }); setEditing(false) }}
          className="outline-none p-2 min-h-[2rem]"
          dangerouslySetInnerHTML={{ __html: block.props.text || 'Your text' }}
          style={{
            color: block.props.color || '#000',
            fontSize: `${block.props.fontSize || 16}px`,
            textAlign: (block.props.textAlign as any) || 'left',
            fontFamily: block.props.fontFamily || 'Arial',
          }}
        />
      ) : (
        <div
          onDoubleClick={() => setEditing(true)}
          className="p-2 cursor-text"
          style={{
            color: block.props.color || '#000',
            fontSize: `${block.props.fontSize || 16}px`,
            textAlign: (block.props.textAlign as any) || 'left',
            fontFamily: block.props.fontFamily || 'Arial',
          }}
        >
          {block.props.text || 'Your text'}
        </div>
      )}
    </div>
  )
}

function ImageBlockContent({ block, selected, onSelect }: {
  block: Block; selected: boolean; onSelect: () => void
}) {
  const src = block.props.src || ''
  const hasImage = src && src.trim().length > 0
  const objectFit = block.props.objectFit || 'fill'
  const alignment = block.props.alignment || 'center'
  const height = block.props.height || 'auto'
  const maxWidth = block.props.maxWidth || '100%'

  return (
    <div onClick={onSelect} className="cursor-pointer" style={{ textAlign: alignment as any }}>
      {hasImage ? (
        <img
          src={src}
          alt={block.props.alt || ''}
          style={{ objectFit: objectFit as any, height, maxWidth }}
          className="w-full h-auto"
        />
      ) : (
        <div className="w-full h-40 bg-gray-200 border-2 border-dashed border-gray-400 rounded flex flex-col items-center justify-center text-gray-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-sm">Click to add an image URL</span>
        </div>
      )}
    </div>
  )
}

function VideoBlockContent({ block, selected, onSelect }: {
  block: Block; selected: boolean; onSelect: () => void
}) {
  const getEmbedUrl = (url: string) => {
    const match = url.match(/v=([^&]+)/)
    return match ? `https://www.youtube.com/embed/${match[1]}` : url
  }
  return (
    <div onClick={onSelect} className="relative cursor-pointer">
      <div className="absolute inset-0 z-10" onClick={onSelect} />
      <iframe
        width="100%"
        height="315"
        src={getEmbedUrl(block.props.youtubeUrl || '')}
        allowFullScreen
        className="max-w-full pointer-events-none"
      />
    </div>
  )
}

function FormBlockContent({ block, selected, onSelect }: {
  block: Block; selected: boolean; onSelect: () => void
}) {
  return (
    <div onClick={onSelect} className="bg-white rounded p-4 cursor-pointer">
      <form onSubmit={(e) => e.preventDefault()}>
        <input type="email" placeholder="Email" required className="w-full border p-2 mb-2 rounded" />
        <input type="text" placeholder="First Name" className="w-full border p-2 mb-2 rounded" />
        <button type="submit" className="w-full bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 text-center">
          Submit
        </button>
      </form>
      <div className="mt-2 text-xs text-gray-500">
        List: {block.props.listId || 'None'} | Redirect: {block.props.redirect || 'Next page'}
      </div>
    </div>
  )
}

function ButtonBlockContent({ block, selected, onSelect }: {
  block: Block; selected: boolean; onSelect: () => void
}) {
  const widthMode = block.props.width || 'auto'
  const alignment = block.props.textAlign || 'center'
  return (
    <div onClick={onSelect} className="cursor-pointer" style={{ textAlign: alignment as any }}>
      <a
        href={block.props.url || '#'}
        className={`inline-block bg-indigo-600 text-white px-4 py-2 rounded no-underline ${widthMode === 'full' ? 'w-full' : ''}`}
        style={{
          fontFamily: block.props.fontFamily || 'Arial',
          fontSize: `${block.props.fontSize || 16}px`,
        }}
      >
        {block.props.text || 'Click Me'}
      </a>
      <div className="text-xs text-gray-500 mt-1">
        {block.props.listId && <>List: {block.props.listId}</>}
        {block.props.redirect && <> | Redirect: {block.props.redirect}</>}
      </div>
    </div>
  )
}

// ---------------------- Grid Block ----------------------



function GridBlockContent({ block, selected, onSelect, onChange, activeCell, onCellSelect }: {
  block: Block
  selected: boolean
  onSelect: () => void
  onChange: (props: Record<string, any>) => void
  activeCell: { row: number; col: number } | null
  onCellSelect: (row: number, col: number) => void
}) {
  const rows = block.props.rows || 1
  const cols = block.props.cols || 1
  const cells: GridCell[] = block.props.cells || []

  const getCell = (r: number, c: number): GridCell | undefined => {
    return cells.find(
      cell =>
        cell.row <= r &&
        r < cell.row + cell.rowspan &&
        cell.col <= c &&
        c < cell.col + cell.colspan
    )
  }

  return (
    <div onClick={onSelect} className="p-4 cursor-pointer" style={{ minHeight: '80px' }}>
      <div className="grid border border-gray-300" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: rows }).map((_, r) =>
          Array.from({ length: cols }).map((_, c) => {
            const cell = getCell(r, c)
            if (!cell) return null
            if (cell.row !== r || cell.col !== c) return null
            const isActive = activeCell?.row === r && activeCell?.col === c
            return (
              <div
                key={`${r}-${c}`}
                className={`border border-gray-200 p-2 min-h-[40px] relative cursor-pointer ${isActive ? 'ring-2 ring-indigo-500' : ''}`}
                style={{
                  gridRow: `span ${cell.rowspan}`,
                  gridColumn: `span ${cell.colspan}`,
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  onCellSelect(r, c)
                }}
              >
                {cell.blocks.map(child => (
                  <div key={child.id} className="mb-1">
                    {child.type === 'TextBlock' && (
                      <div style={{ color: child.props.color, fontSize: `${child.props.fontSize || 16}px`, textAlign: child.props.textAlign }}>
                        {child.props.text || 'Text'}
                      </div>
                    )}
                    {child.type === 'ImageBlock' && (
                      <img src={child.props.src} alt={child.props.alt} style={{ maxWidth: '100%' }} />
                    )}
                    {child.type === 'ButtonBlock' && (
                      <a href={child.props.url} className="inline-block bg-indigo-600 text-white px-4 py-2 rounded no-underline">
                        {child.props.text || 'Button'}
                      </a>
                    )}
                    {child.type === 'FormBlock' && (
                      <div className="text-xs">Form (list: {child.props.listId})</div>
                    )}
                    {child.type === 'VideoBlock' && (
                      <div className="text-xs">Video</div>
                    )}
                  </div>
                ))}
                {cell.blocks.length === 0 && (
                  <div className="text-xs text-gray-400 text-center">Empty</div>
                )}
                <div className="absolute bottom-0 right-0 text-xs text-gray-400 p-1">
                  {`${r},${c}`}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ---------------------- Properties panel ----------------------
function PropertiesPanel({ block, onChange, onMergeCells, onSplitCell, activeCell }: {
  block: Block | null
  onChange: (props: Record<string, any>, style?: BlockStyle) => void
  onMergeCells?: () => void
  onSplitCell?: () => void
  activeCell?: { row: number; col: number } | null
}) {
  if (!block) return <div className="p-4 text-gray-500">Select a block to edit</div>

  const isGrid = block.type === 'GridBlock'
  const isImage = block.type === 'ImageBlock'
  const isTextOrButton = block.type === 'TextBlock' || block.type === 'ButtonBlock'

  return (
    <div className="p-4 space-y-4 overflow-y-auto">
      <h3 className="font-semibold text-lg">{block.type}</h3>

      {/* Grid specific controls */}
      {isGrid && (
        <div className="space-y-2">
          <div>
            <label className="text-xs">Rows</label>
            <input
              type="number"
              value={block.props.rows || 1}
              onChange={(e) => onChange({ ...block.props, rows: parseInt(e.target.value) || 1 }, block.style)}
              className="w-full border p-2 rounded text-sm"
            />
          </div>
          <div>
            <label className="text-xs">Columns</label>
            <input
              type="number"
              value={block.props.cols || 1}
              onChange={(e) => onChange({ ...block.props, cols: parseInt(e.target.value) || 1 }, block.style)}
              className="w-full border p-2 rounded text-sm"
            />
          </div>
          {activeCell && (
            <div className="text-xs text-gray-600">
              Active cell: ({activeCell.row},{activeCell.col})
              {onMergeCells && (
                <button onClick={onMergeCells} className="ml-2 bg-blue-500 text-white px-2 py-1 rounded text-xs">Merge</button>
              )}
              {onSplitCell && (
                <button onClick={onSplitCell} className="ml-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs">Split</button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Image specific controls */}
      {isImage && (
        <div className="space-y-2">
          <div>
            <label className="text-xs">Image URL</label>
            <input
              type="text"
              value={block.props.src || ''}
              onChange={(e) => onChange({ ...block.props, src: e.target.value }, block.style)}
              className="w-full border p-2 rounded text-sm"
            />
          </div>
          <div>
            <label className="text-xs">Object Fit</label>
            <div className="flex gap-2 mt-1">
              {(['fill', 'cover', 'contain'] as const).map(fit => (
                <button
                  key={fit}
                  onClick={() => onChange({ ...block.props, objectFit: fit }, block.style)}
                  className={`px-2 py-1 border rounded text-xs ${block.props.objectFit === fit ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700'}`}
                >
                  {fit}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs">Height</label>
            <input
              type="text"
              value={block.props.height || 'auto'}
              onChange={(e) => onChange({ ...block.props, height: e.target.value }, block.style)}
              className="w-full border p-2 rounded text-sm"
            />
          </div>
          <div>
            <label className="text-xs">Max Width</label>
            <input
              type="text"
              value={block.props.maxWidth || '100%'}
              onChange={(e) => onChange({ ...block.props, maxWidth: e.target.value }, block.style)}
              className="w-full border p-2 rounded text-sm"
            />
          </div>
          <div>
            <label className="text-xs">Alignment</label>
            <div className="flex gap-1 mt-1">
              {(['left', 'center', 'right'] as const).map(align => (
                <button
                  key={align}
                  onClick={() => onChange({ ...block.props, alignment: align }, block.style)}
                  className={`px-3 py-1 border rounded text-xs ${block.props.alignment === align ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700'}`}
                >
                  {align === 'left' ? '⫷' : align === 'center' ? '□' : '⫸'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Common content props */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-600">Content</p>
        {Object.entries(block.props).map(([key, value]) => {
          // Hide keys that have special UI
          if (['listId', 'redirect', 'textAlign', 'width', 'fontFamily', 'fontSize', 'rows', 'cols', 'cells', 'src', 'objectFit', 'height', 'maxWidth', 'alignment'].includes(key)) return null
          return (
            <div key={key}>
              <label className="text-xs capitalize">{key}</label>
              <input
                type="text"
                value={value as string}
                onChange={(e) => { const updated = { ...block.props, [key]: e.target.value }; onChange(updated, block.style) }}
                className="w-full border p-2 rounded text-sm"
              />
            </div>
          )
        })}

        {isTextOrButton && (
          <>
            <div>
              <label className="text-xs">Font Size (px)</label>
              <input
                type="number"
                min={1}
                value={block.props.fontSize || 16}
                onChange={(e) => onChange({ ...block.props, fontSize: e.target.value }, block.style)}
                className="w-full border p-2 rounded text-sm"
              />
            </div>
            <div>
              <label className="text-xs">Font</label>
              <select
                value={block.props.fontFamily || 'Arial'}
                onChange={(e) => onChange({ ...block.props, fontFamily: e.target.value }, block.style)}
                className="w-full border p-2 rounded text-sm"
              >
                {FONT_OPTIONS.map(font => <option key={font} value={font}>{font}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs">Alignment</label>
              <div className="flex gap-1 mt-1">
                {(['left', 'center', 'right'] as const).map(align => (
                  <button
                    key={align}
                    onClick={() => onChange({ ...block.props, textAlign: align }, block.style)}
                    className={`px-3 py-1 border rounded text-xs ${block.props.textAlign === align ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700'}`}
                  >
                    {align === 'left' ? '⫷' : align === 'center' ? '□' : '⫸'}
                  </button>
                ))}
              </div>
            </div>
            {block.type === 'ButtonBlock' && (
              <div>
                <label className="text-xs">Width</label>
                <select
                  value={block.props.width || 'auto'}
                  onChange={(e) => onChange({ ...block.props, width: e.target.value }, block.style)}
                  className="w-full border p-2 rounded text-sm"
                >
                  <option value="auto">Auto (content width)</option>
                  <option value="full">Full width</option>
                </select>
              </div>
            )}
          </>
        )}

        {(block.type === 'FormBlock' || block.type === 'ButtonBlock') && (
          <>
            <div>
              <label className="text-xs">List ID</label>
              <input type="text" value={block.props.listId || ''} onChange={(e) => onChange({ ...block.props, listId: e.target.value }, block.style)} className="w-full border p-2 rounded text-sm" />
            </div>
            <div>
              <label className="text-xs">Redirect</label>
              <input type="text" value={block.props.redirect || ''} onChange={(e) => onChange({ ...block.props, redirect: e.target.value }, block.style)} className="w-full border p-2 rounded text-sm" />
            </div>
          </>
        )}
      </div>

      {/* Style */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-600">Style</p>
        {['Padding', 'Margin'].map((group) => {
          const sides = ['Top', 'Right', 'Bottom', 'Left']
          const prefix = group.toLowerCase()
          return (
            <div key={group}>
              <p className="text-xs font-medium text-gray-500">{group}</p>
              <div className="grid grid-cols-4 gap-1">
                {sides.map((side) => {
                  const key = `${prefix}${side}`
                  return (
                    <div key={key} className="flex items-center">
                      <span className="text-xs w-6">{side.charAt(0)}</span>
                      <input
                        type="text"
                        value={block.style[key] || '0'}
                        onChange={(e) => { const newStyle = { ...block.style, [key]: e.target.value }; onChange(block.props, newStyle) }}
                        className="flex-1 border p-1 rounded text-xs min-w-0"
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
        <div>
          <label className="text-xs">Background</label>
          <input type="text" value={block.style.backgroundColor || 'transparent'} onChange={(e) => onChange(block.props, { ...block.style, backgroundColor: e.target.value })} className="w-full border p-2 rounded text-sm" />
        </div>
        <div>
          <label className="text-xs">Border</label>
          <input type="text" value={block.style.border || 'none'} onChange={(e) => onChange(block.props, { ...block.style, border: e.target.value })} className="w-full border p-2 rounded text-sm" />
        </div>
        <div>
          <label className="text-xs">Border Radius</label>
          <input type="text" value={block.style.borderRadius || '0'} onChange={(e) => onChange(block.props, { ...block.style, borderRadius: e.target.value })} className="w-full border p-2 rounded text-sm" />
        </div>
      </div>
    </div>
  )
}

// ---------------------- Palette ----------------------
const blockTypes: { type: BlockType; label: string }[] = [
  { type: 'TextBlock', label: '+ Text' },
  { type: 'ImageBlock', label: '+ Image' },
  { type: 'VideoBlock', label: '+ Video' },
  { type: 'FormBlock', label: '+ Form' },
  { type: 'ButtonBlock', label: '+ Button' },
  { type: 'GridBlock', label: '+ Grid' },
]

function Palette({ onAdd }: { onAdd: (type: BlockType) => void }) {
  return (
    <div className="w-48 bg-gray-50 border-r p-4 space-y-2 overflow-y-auto">
      <p className="font-semibold text-sm mb-2">Add Blocks</p>
      {blockTypes.map(({ type, label }) => (
        <button key={type} onClick={() => onAdd(type)} className="w-full text-left px-3 py-2 rounded hover:bg-gray-100">
          {label}
        </button>
      ))}
    </div>
  )
}

// ---------------------- Main editor ----------------------
export default function CustomPageEditor() {
  const params = useParams()
  const funnelId = params.id as string
  const pageId = params.pageId as string
  const router = useRouter()
  const [blocks, setBlocks] = useState<Block[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeCell, setActiveCell] = useState<{ row: number; col: number } | null>(null)

  useEffect(() => {
    fetch(`/api/funnels/${funnelId}`)
      .then(r => r.json())
      .then(funnel => {
        const page = funnel.pages?.find((p: any) => p.id === pageId)
        if (page?.config?.blocks) {
          setBlocks(page.config.blocks)
        }
        setLoading(false)
      })
  }, [funnelId, pageId])

  const addBlock = useCallback((type: BlockType) => {
    const id = 'blk-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)
    const defaultProps: Record<string, any> = {}
    if (type === 'TextBlock') {
      defaultProps.text = 'New text'; defaultProps.fontSize = '16'; defaultProps.fontFamily = 'Arial'; defaultProps.textAlign = 'left'
    } else if (type === 'ImageBlock') {
      defaultProps.src = ''; defaultProps.objectFit = 'fill'; defaultProps.alignment = 'center'; defaultProps.height = 'auto'; defaultProps.maxWidth = '100%'
    } else if (type === 'VideoBlock') {
      defaultProps.youtubeUrl = 'https://www.youtube.com/embed/dQw4w9WgXcQ'
    } else if (type === 'FormBlock') {
      defaultProps.listId = ''; defaultProps.redirect = ''
    } else if (type === 'ButtonBlock') {
      defaultProps.text = 'Click Me'; defaultProps.url = '#'; defaultProps.listId = ''; defaultProps.redirect = ''; defaultProps.width = 'auto'; defaultProps.textAlign = 'center'; defaultProps.fontSize = '16'; defaultProps.fontFamily = 'Arial'
    } else if (type === 'GridBlock') {
      defaultProps.rows = 2; defaultProps.cols = 2
      const cells: GridCell[] = []
      for (let r = 0; r < defaultProps.rows; r++) {
        for (let c = 0; c < defaultProps.cols; c++) {
          cells.push({ row: r, col: c, rowspan: 1, colspan: 1, blocks: [] })
        }
      }
      defaultProps.cells = cells
    }
    setBlocks(prev => [...prev, { id, type, props: defaultProps, style: { ...defaultStyle } }])
  }, [])

  const addBlockToCell = useCallback((blockId: string, row: number, col: number, childType: BlockType) => {
    setBlocks(prev => prev.map(block => {
      if (block.id !== blockId) return block
      const cells = [...(block.props.cells || [])]
      const cellIndex = cells.findIndex(c => c.row === row && c.col === col)
      if (cellIndex === -1) return block
      const childId = 'child-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)
      const newChild: Block = {
        id: childId,
        type: childType,
        props: childType === 'TextBlock' ? { text: 'New text', fontSize: '16', fontFamily: 'Arial', textAlign: 'left' } : {},
        style: { ...defaultStyle },
      }
      cells[cellIndex] = {
        ...cells[cellIndex],
        blocks: [...cells[cellIndex].blocks, newChild],
      }
      return { ...block, props: { ...block.props, cells } }
    }))
  }, [])

  const updateBlock = useCallback((id: string, props?: Record<string, any>, style?: BlockStyle) => {
    setBlocks(prev => prev.map(b => {
      if (b.id !== id) return b
      return {
        ...b,
        props: props !== undefined ? { ...b.props, ...props } : b.props,
        style: style !== undefined ? { ...b.style, ...style } : b.style,
      }
    }))
  }, [])

  const deleteSelected = useCallback(() => {
    if (!selectedId) return
    setBlocks(prev => prev.filter(b => b.id !== selectedId))
    setSelectedId(null)
    setActiveCell(null)
  }, [selectedId])

  const handleBlockSelect = useCallback((id: string) => {
    setSelectedId(id)
    setActiveCell(null) // Réinitialise la cellule active quand on sélectionne un bloc
  }, [])

  const mergeSelectedCells = useCallback(() => {
    if (!selectedId || !activeCell) return
    const block = blocks.find(b => b.id === selectedId)
    if (!block || block.type !== 'GridBlock') return
    const cells = [...block.props.cells]
    const cellIdx = cells.findIndex(c => c.row === activeCell.row && c.col === activeCell.col)
    if (cellIdx === -1) return
    // Simple fusion : on augmente le rowspan de la cellule active (exemple)
    cells[cellIdx] = { ...cells[cellIdx], rowspan: 2 }
    updateBlock(selectedId, { ...block.props, cells })
  }, [selectedId, activeCell, blocks, updateBlock])

  const splitSelectedCell = useCallback(() => {
    if (!selectedId || !activeCell) return
    const block = blocks.find(b => b.id === selectedId)
    if (!block || block.type !== 'GridBlock') return
    const cells = [...block.props.cells]
    const cellIdx = cells.findIndex(c => c.row === activeCell.row && c.col === activeCell.col)
    if (cellIdx === -1) return
    cells[cellIdx] = { ...cells[cellIdx], rowspan: 1, colspan: 1 }
    updateBlock(selectedId, { ...block.props, cells })
  }, [selectedId, activeCell, blocks, updateBlock])

  const sensors = useSensors(useSensor(PointerSensor))
  const handleDragEnd = useCallback((event: any) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setBlocks(prev => {
      const oldIndex = prev.findIndex(b => b.id === active.id)
      const newIndex = prev.findIndex(b => b.id === over.id)
      const newBlocks = [...prev]
      const [removed] = newBlocks.splice(oldIndex, 1)
      newBlocks.splice(newIndex, 0, removed)
      return newBlocks
    })
  }, [])

  const save = useCallback(async () => {
    const res = await fetch(`/api/funnels/${funnelId}/pages/${pageId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: { blocks } }),
    })
    if (res.ok) {
      alert('Page saved!')
      router.back()
    } else {
      alert('Save failed')
    }
  }, [blocks, funnelId, pageId, router])

  if (loading) return <div className="p-8">Loading...</div>

  const selectedBlock = blocks.find(b => b.id === selectedId) || null
  const isGridSelected = selectedBlock?.type === 'GridBlock'

  return (
    <div className="h-screen flex flex-col">
      <div className="flex justify-between items-center p-4 bg-gray-100 border-b">
        <h1 className="text-xl font-bold">Page Builder</h1>
        <div className="flex gap-2">
          <button onClick={save} className="bg-indigo-600 text-white px-4 py-2 rounded">Save & Close</button>
          <button onClick={() => router.back()} className="bg-gray-200 px-4 py-2 rounded">Cancel</button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <Palette onAdd={addBlock} />

        <div className="flex-1 bg-gray-50 p-8 overflow-y-auto">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
              {blocks.map(block => (
                <SortableBlock
                  key={block.id}
                  block={block}
                  isSelected={selectedId === block.id}
                  onSelect={() => handleBlockSelect(block.id)}
                  onChange={(props) => updateBlock(block.id, props)}
                  activeCell={selectedId === block.id ? activeCell : null}
                  onCellSelect={(row, col) => setActiveCell({ row, col })}
                />
              ))}
            </SortableContext>
          </DndContext>
          {blocks.length === 0 && <p className="text-gray-400 text-center mt-20">Add blocks from the left panel</p>}
        </div>

        <div className="w-72 bg-gray-50 border-l overflow-y-auto">
          <div className="p-4 border-b">
            <button onClick={deleteSelected} disabled={!selectedBlock} className="bg-red-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50">Delete Block</button>
            {isGridSelected && activeCell && (
              <div className="mt-2 flex gap-1">
                <button onClick={() => addBlockToCell(selectedId!, activeCell.row, activeCell.col, 'TextBlock')} className="bg-green-500 text-white px-2 py-1 rounded text-xs">+ Text</button>
                <button onClick={() => addBlockToCell(selectedId!, activeCell.row, activeCell.col, 'ImageBlock')} className="bg-green-500 text-white px-2 py-1 rounded text-xs">+ Image</button>
              </div>
            )}
          </div>
          <PropertiesPanel
            block={selectedBlock}
            onChange={(props, style) => selectedId && updateBlock(selectedId, props, style)}
            onMergeCells={isGridSelected ? mergeSelectedCells : undefined}
            onSplitCell={isGridSelected ? splitSelectedCell : undefined}
            activeCell={isGridSelected ? activeCell : undefined}
          />
        </div>
      </div>
    </div>
  )
}