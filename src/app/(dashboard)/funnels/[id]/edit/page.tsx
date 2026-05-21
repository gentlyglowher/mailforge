'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  Connection,
  Edge,
  Node,
  useEdgesState,
  useNodesState,
} from 'reactflow'
import 'reactflow/dist/style.css'

import Card from '@/components/Card'

// ----- Node types -----
const nodeTypes = {
  landingPage: LandingNode,
  form: FormNode,
  sequence: SequenceNode,
  tag: TagNode,
  webhook: WebhookNode,
  wait: WaitNode,
  condition: ConditionNode,
}

// Each node component
function LandingNode({ data }: any) {
  return (
    <div className="bg-blue-100 border-2 border-blue-500 rounded px-4 py-2 text-sm font-medium text-blue-800">
      🌐 Landing Page
      <div className="text-xs text-gray-600">{data.url || '(no URL)'}</div>
    </div>
  )
}
function FormNode({ data }: any) {
  return (
    <div className="bg-green-100 border-2 border-green-500 rounded px-4 py-2 text-sm font-medium text-green-800">
      📝 Form
      <div className="text-xs text-gray-600">{data.listId ? 'List: ' + data.listId : '(no list)'}</div>
    </div>
  )
}
function SequenceNode({ data }: any) {
  return (
    <div className="bg-purple-100 border-2 border-purple-500 rounded px-4 py-2 text-sm font-medium text-purple-800">
      🔄 Sequence
      <div className="text-xs text-gray-600">{data.sequenceId ? 'Seq: ' + data.sequenceId : '(no seq)'}</div>
    </div>
  )
}
function TagNode({ data }: any) {
  return (
    <div className="bg-yellow-100 border-2 border-yellow-500 rounded px-4 py-2 text-sm font-medium text-yellow-800">
      🏷 Tag
      <div className="text-xs text-gray-600">{data.tag || '(no tag)'}</div>
    </div>
  )
}
function WebhookNode({ data }: any) {
  return (
    <div className="bg-red-100 border-2 border-red-500 rounded px-4 py-2 text-sm font-medium text-red-800">
      🔗 Webhook
      <div className="text-xs text-gray-600">{data.url || '(no URL)'}</div>
    </div>
  )
}
function WaitNode({ data }: any) {
  return (
    <div className="bg-gray-100 border-2 border-gray-500 rounded px-4 py-2 text-sm font-medium text-gray-800">
      ⏳ Wait
      <div className="text-xs text-gray-600">{data.hours ?? 0} hours</div>
    </div>
  )
}
function ConditionNode({ data }: any) {
  return (
    <div className="bg-orange-100 border-2 border-orange-500 rounded px-4 py-2 text-sm font-medium text-orange-800">
      ❓ Condition
      <div className="text-xs text-gray-600">{data.expression || '(no expr)'}</div>
    </div>
  )
}

export default function FunnelEditor() {
  const params = useParams()
  const funnelId = params.id as string
  const router = useRouter()

  const [funnel, setFunnel] = useState<any>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch funnel data and rebuild flow
  useEffect(() => {
    const fetchFunnel = async () => {
      const res = await fetch(`/api/funnels/${funnelId}`)
      if (res.ok) {
        const data = await res.json()
        setFunnel(data)
        // Convert steps to nodes & edges
        const newNodes: Node[] = (data.steps || []).map((step: any, idx: number) => ({
          id: step.id,
          type: step.type,
          position: { x: 100 + idx * 250, y: 100 + (idx % 2) * 150 },
          data: step.config || {},
        }))
        const newEdges: Edge[] = (data.steps || []).slice(0, -1).map((_: any, idx: number) => ({
          id: `e${data.steps[idx].id}-${data.steps[idx+1].id}`,
          source: data.steps[idx].id,
          target: data.steps[idx+1].id,
        }))
        setNodes(newNodes)
        setEdges(newEdges)
      }
      setLoading(false)
    }
    fetchFunnel()
  }, [funnelId])

  // Connection handler
  const onConnect = useCallback((params: Connection) => setEdges(eds => addEdge(params, eds)), [setEdges])

  // Node click → open config
  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
  }, [])

  // Add new step
  const addStep = (type: string) => {
    const newId = `temp-${Date.now()}`
    const newNode: Node = {
      id: newId,
      type,
      position: { x: Math.random() * 400 + 50, y: Math.random() * 300 + 50 },
      data: {},
    }
    setNodes(nds => [...nds, newNode])
  }

  // Save whole funnel
  const saveFunnel = async () => {
    // Build steps array with order based on edges (simple linear order for now)
    const nodeMap = new Map(nodes.map(n => [n.id, n]))
    // Find start node (no incoming edges)
    const targetIds = new Set(edges.map(e => e.target))
    const startNodes = nodes.filter(n => !targetIds.has(n.id))
    if (startNodes.length === 0) {
      alert('Please add at least one node')
      return
    }
    const ordered: Node[] = []
    const visited = new Set()
    const traverse = (node: Node) => {
      if (visited.has(node.id)) return
      visited.add(node.id)
      ordered.push(node)
      const outEdges = edges.filter(e => e.source === node.id)
      for (const e of outEdges) {
        const target = nodeMap.get(e.target)
        if (target) traverse(target)
      }
    }
    traverse(startNodes[0]) // simple single path, but can handle branching later
    const steps = ordered.map((node, idx) => ({
      id: node.id.startsWith('temp-') ? undefined : node.id, // keep id for existing, new ones will be inserted
      type: node.type,
      config: node.data,
      order: idx,
    }))

    const res = await fetch(`/api/funnels/${funnelId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ steps }),
    })
    if (res.ok) {
      alert('Funnel saved!')
      router.refresh()
    } else {
      alert('Error saving funnel')
    }
  }

  // Update selected node data
  const updateNodeData = (field: string, value: any) => {
    if (!selectedNode) return
    setNodes(nds => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, [field]: value } } : n))
    setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, [field]: value } })
  }

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Edit Funnel: {funnel?.name}</h1>
        <div className="flex gap-2">
          <button onClick={saveFunnel} className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-500">Save</button>
          <button onClick={() => router.push('/funnels')} className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300">Back</button>
        </div>
      </div>

      <div className="flex flex-1 gap-4">
        {/* Sidebar with step buttons */}
        <div className="w-48 bg-white rounded shadow p-4 space-y-2">
          <p className="font-semibold text-sm mb-2">Add Step</p>
          {Object.keys(nodeTypes).map(type => (
            <button
              key={type}
              onClick={() => addStep(type)}
              className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 text-sm"
            >
              + {type.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Flow canvas */}
        <div className="flex-1 bg-white rounded shadow">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background />
            <Controls />
          </ReactFlow>
        </div>

        {/* Config panel for selected node */}
        {selectedNode && (
          <div className="w-64 bg-white rounded shadow p-4 space-y-3">
            <p className="font-semibold">Step Config</p>
            <p className="text-sm text-gray-500">Type: {selectedNode.type}</p>
            {/* Dynamically show fields based on type */}
            {selectedNode.type === 'landing_page' && (
              <div>
                <label className="text-sm">Page URL</label>
                <input
                  type="text"
                  value={selectedNode.data.url || ''}
                  onChange={e => updateNodeData('url', e.target.value)}
                  className="w-full border p-2 rounded"
                />
              </div>
            )}
            {selectedNode.type === 'form' && (
              <div>
                <label className="text-sm">List ID</label>
                <input
                  type="text"
                  value={selectedNode.data.listId || ''}
                  onChange={e => updateNodeData('listId', e.target.value)}
                  className="w-full border p-2 rounded"
                />
              </div>
            )}
            {selectedNode.type === 'sequence' && (
              <div>
                <label className="text-sm">Sequence ID</label>
                <input
                  type="text"
                  value={selectedNode.data.sequenceId || ''}
                  onChange={e => updateNodeData('sequenceId', e.target.value)}
                  className="w-full border p-2 rounded"
                />
              </div>
            )}
            {selectedNode.type === 'tag' && (
              <div>
                <label className="text-sm">Tag</label>
                <input
                  type="text"
                  value={selectedNode.data.tag || ''}
                  onChange={e => updateNodeData('tag', e.target.value)}
                  className="w-full border p-2 rounded"
                />
              </div>
            )}
            {selectedNode.type === 'webhook' && (
              <div>
                <label className="text-sm">Webhook URL</label>
                <input
                  type="text"
                  value={selectedNode.data.url || ''}
                  onChange={e => updateNodeData('url', e.target.value)}
                  className="w-full border p-2 rounded"
                />
              </div>
            )}
            {selectedNode.type === 'wait' && (
              <div>
                <label className="text-sm">Hours</label>
                <input
                  type="number"
                  value={selectedNode.data.hours || 0}
                  onChange={e => updateNodeData('hours', Number(e.target.value))}
                  className="w-full border p-2 rounded"
                />
              </div>
            )}
            {selectedNode.type === 'condition' && (
              <div>
                <label className="text-sm">Expression</label>
                <input
                  type="text"
                  value={selectedNode.data.expression || ''}
                  onChange={e => updateNodeData('expression', e.target.value)}
                  className="w-full border p-2 rounded"
                />
              </div>
            )}
            <button
              onClick={() => setSelectedNode(null)}
              className="text-xs text-gray-500 underline"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}