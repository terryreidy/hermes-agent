import type { EdgeItem, NodeItem } from '../types'

interface GraphEdgesProps {
  edges: EdgeItem[]
  nodes: NodeItem[]
  activeNodeId?: string
}

const edgeClassByType: Record<EdgeItem['type'], string> = {
  related: 'edge edge-related',
  'inspired-by': 'edge edge-inspired',
  'follow-up': 'edge edge-follow-up',
  contrast: 'edge edge-contrast',
}

export function GraphEdges({ edges, nodes, activeNodeId }: GraphEdgesProps) {
  const nodesById = new Map(nodes.map((node) => [node.id, node]))

  return (
    <svg className="graph-edges" width="1500" height="1350" viewBox="0 0 1500 1350" aria-hidden="true">
      {edges.map((edge) => {
        const source = nodesById.get(edge.source)
        const target = nodesById.get(edge.target)

        if (!source || !target) {
          return null
        }

        const isActive = activeNodeId === source.id || activeNodeId === target.id
        const dx = Math.abs(target.position.x - source.position.x)
        const curve = Math.max(40, Math.min(150, dx / 3))
        const path = `M ${source.position.x} ${source.position.y} C ${source.position.x + curve} ${source.position.y - 40}, ${target.position.x - curve} ${target.position.y + 40}, ${target.position.x} ${target.position.y}`

        return (
          <path
            key={`${edge.source}-${edge.target}`}
            className={`${edgeClassByType[edge.type]} ${isActive ? 'is-active' : ''}`}
            d={path}
          />
        )
      })}
    </svg>
  )
}
