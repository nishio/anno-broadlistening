import dagre from 'dagre'
import React, { useEffect, useState } from 'react'
import { useGraphInteraction } from '@/hooks/useGraphInteraction'
import { GraphEdge, GraphNode, TaskData } from '@/types/graph'

// Color palette optimized for color vision deficiencies
const COLORS = {
  node: {
    fill: '#E8F5E9',
    stroke: '#2E7D32',
    text: '#1B5E20'
  },
  edge: {
    stroke: '#546E7A',
    arrow: '#37474F'
  }
}

interface TaskDependencyGraphProps {
  tasks: TaskData[]
  width?: number
  height?: number
}

const TaskDependencyGraph: React.FC<TaskDependencyGraphProps> = ({
  tasks,
  width = 800,
  height = 600
}) => {
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([])
  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>([])

  // Calculate graph layout
  useEffect(() => {
    const dagreGraph = new dagre.graphlib.Graph()
    dagreGraph.setGraph({ rankdir: 'TB', nodesep: 70, ranksep: 50 })
    dagreGraph.setDefaultEdgeLabel(() => ({}))

    // Add nodes
    tasks.forEach((task) => {
      dagreGraph.setNode(task.id, {
        label: task.title,
        width: 150,
        height: 40
      })
    })

    // Add edges
    tasks.forEach((task) => {
      if (task.dependencies?.must) {
        task.dependencies.must.forEach((dep) => {
          dagreGraph.setEdge(dep.task_id, task.id)
        })
      }
    })

    // Calculate layout
    dagre.layout(dagreGraph)

    // Convert to our graph format
    const nodes = dagreGraph.nodes().map((nodeId) => {
      const node = dagreGraph.node(nodeId)
      return {
        id: nodeId,
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
        label: node.label || nodeId // Fallback to nodeId if label is undefined
      }
    })

    const edges = dagreGraph.edges().map((edge) => {
      const edgeObj = dagreGraph.edge(edge)
      return {
        from: edge.v,
        to: edge.w,
        points: edgeObj.points
      }
    })

    setGraphNodes(nodes)
    setGraphEdges(edges)
  }, [tasks])

  const { transform, containerRef, isDragging } = useGraphInteraction({
    minScale: 0.1,
    maxScale: 4,
    initialScale: 0.8
  })

  // Render edges (lines with arrows)
  const renderEdges = () => {
    return graphEdges.map((edge, index) => {
      const points = edge.points.map(p => `${p.x},${p.y}`).join(' ')
      return (
        <g key={`edge-${index}`}>
          <polyline
            points={points}
            fill="none"
            stroke={COLORS.edge.stroke}
            strokeWidth="1.5"
            markerEnd="url(#arrowhead)"
          />
        </g>
      )
    })
  }

  // Render nodes (rectangles with text)
  const renderNodes = () => {
    return graphNodes.map((node) => (
      <g key={node.id} transform={`translate(${node.x},${node.y})`}>
        <rect
          x={-node.width / 2}
          y={-node.height / 2}
          width={node.width}
          height={node.height}
          rx={4}
          ry={4}
          fill={COLORS.node.fill}
          stroke={COLORS.node.stroke}
          strokeWidth="1.5"
        />
        <text
          x="0"
          y="0"
          textAnchor="middle"
          dominantBaseline="middle"
          fill={COLORS.node.text}
          fontSize="12"
        >
          {node.label}
        </text>
      </g>
    ))
  }

  return (
    <svg
      ref={containerRef}
      width={width}
      height={height}
      style={{
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        maxWidth: '100%',
        height: 'auto'
      }}
    >
      <defs>
        <marker
          id="arrowhead"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
        >
          <path
            d="M 0 0 L 10 5 L 0 10 z"
            fill={COLORS.edge.arrow}
          />
        </marker>
      </defs>
      <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
        {renderEdges()}
        {renderNodes()}
      </g>
    </svg>
  )
}

export default TaskDependencyGraph
