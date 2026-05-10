import type { CSSProperties } from 'react'
import type { EdgeItem } from '../types'
import type { ProjectedNode } from './NodeMarker'

interface GraphEdgesProps {
  edges: EdgeItem[]
  nodes: ProjectedNode[]
  activeNodeId?: string
  width: number
  height: number
}

const edgeClassByType: Record<EdgeItem['type'], string> = {
  related: 'edge edge-related',
  'inspired-by': 'edge edge-inspired',
  'follow-up': 'edge edge-follow-up',
  contrast: 'edge edge-contrast',
}

export function GraphEdges({ edges, nodes, activeNodeId, width, height }: GraphEdgesProps) {
  const nodesById = new Map(nodes.map((node) => [node.id, node]))

  return (
    <svg className="graph-edges" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      {edges.map((edge) => {
        const source = nodesById.get(edge.source)
        const target = nodesById.get(edge.target)

        if (!source || !target) {
          return null
        }

        const isActive = activeNodeId === source.id || activeNodeId === target.id
        const averageDepth = (source.depth + target.depth) / 2
        const dx = Math.abs(target.position.x - source.position.x)
        const curve = Math.max(30, Math.min(190, dx / 3))
        const depthSag = (1 - averageDepth) * 28
        const path = `M ${source.position.x} ${source.position.y} C ${source.position.x + curve} ${source.position.y - 38 + depthSag}, ${target.position.x - curve} ${target.position.y + 38 + depthSag}, ${target.position.x} ${target.position.y}`

        return (
          <path
            key={`${edge.source}-${edge.target}`}
            className={`${edgeClassByType[edge.type]} ${isActive ? 'is-active' : ''}`}
            d={path}
            style={{
              opacity: isActive ? 0.88 : 0.1 + averageDepth * 0.28,
              filter: `blur(${Math.max(0, (1 - averageDepth) * 1.1)}px)`,
            } as CSSProperties}
          />
        )
      })}
    </svg>
  )
}
