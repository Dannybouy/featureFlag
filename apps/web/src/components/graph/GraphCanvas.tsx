import { useState, useCallback, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from 'dagre'
import type { Flag, Dependency, Environment } from '@repo/types'

interface GraphCanvasProps {
  flags: Flag[]
  dependencies: Dependency[]
  environment: Environment
}

export default function GraphCanvas({
  flags,
  dependencies,
  environment,
}: GraphCanvasProps) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null)

  // Build graph structure from flags and dependencies
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    // Create nodes
    const nodes: Node[] = flags.map(flag => {
      const isEnabled = flag.states[environment]
      return {
        id: flag.id,
        data: { label: flag.name },
        position: { x: 0, y: 0 }, // Will be set by Dagre
        style: {
          background: isEnabled ? '#22c55e' : '#64748b',
          color: '#fff',
          border: '2px solid #1e293b',
          borderRadius: '8px',
          padding: '10px',
          fontSize: '12px',
          fontWeight: 'bold',
          minWidth: '120px',
          textAlign: 'center',
        },
      }
    })

    // Create edges
    const edges: Edge[] = dependencies.map(dep => ({
      id: dep.id,
      source: dep.flagId,
      target: dep.dependsOn,
      animated: true,
      style: {
        stroke: dep.type === 'requires' ? '#3b82f6' : '#ef4444',
        strokeWidth: 2,
      },
      data: { type: dep.type },
      label: dep.type === 'requires' ? 'requires' : 'excludes',
      labelStyle: {
        fill: '#fff',
        fontSize: '11px',
      },
    }))

    // Apply Dagre layout
    const dagreGraph = new dagre.graphlib.Graph()
    dagreGraph.setDefaultEdgeLabel(() => ({}))
    dagreGraph.setGraph({
      rankdir: 'LR', // Left to right
      align: 'UL',
      nodesep: 80,
      ranksep: 150,
    })

    nodes.forEach(node => {
      dagreGraph.setNode(node.id, { width: 120, height: 40 })
    })

    edges.forEach(edge => {
      dagreGraph.setEdge(edge.source, edge.target)
    })

    dagre.layout(dagreGraph)

    // Update positions
    const layoutedNodes = nodes.map(node => {
      const nodeWithPosition = dagreGraph.node(node.id)
      return {
        ...node,
        position: {
          x: nodeWithPosition.x - 60,
          y: nodeWithPosition.y - 20,
        },
      }
    })

    return { nodes: layoutedNodes, edges }
  }, [flags, dependencies, environment])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node.id === selectedNode ? null : node.id)
  }, [selectedNode])

  return (
    <div className="w-full h-full bg-slate-900">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        fitView
      >
        <Background color="#334155" gap={16} />
        <Controls />
      </ReactFlow>

      {selectedNode && (
        <div className="absolute bottom-6 left-6 bg-slate-800 border border-slate-700 rounded-lg p-4 max-w-sm">
          <h3 className="font-bold text-white mb-2">
            {flags.find(f => f.id === selectedNode)?.name}
          </h3>
          <p className="text-sm text-slate-300 mb-3">
            {flags.find(f => f.id === selectedNode)?.description}
          </p>
          <p className="text-xs text-slate-400">
            Requires: {dependencies.filter(d => d.dependsOn === selectedNode && d.type === 'requires').length}
            <br />
            Excludes: {dependencies.filter(d => d.dependsOn === selectedNode && d.type === 'excludes').length}
          </p>
          <button
            onClick={() => setSelectedNode(null)}
            className="mt-3 text-xs text-blue-400 hover:text-blue-300"
          >
            Close
          </button>
        </div>
      )}
    </div>
  )
}
