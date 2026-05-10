import type { CSSProperties } from 'react'
import type { ClusterItem, EdgeItem } from '../types'
import type { ProjectedNode } from './NodeMarker'

export interface GraphPoint {
  id: string
  position: {
    x: number
    y: number
  }
  depth: number
}

export interface ProjectedCluster extends Omit<ClusterItem, 'origin'>, GraphPoint {
  origin: {
    x: number
    y: number
  }
  opacity: number
}

interface GraphEdgesProps {
  edges: EdgeItem[]
  nodes: ProjectedNode[]
  clusters: ProjectedCluster[]
  brain: GraphPoint
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

function curvedPath(source: GraphPoint, target: GraphPoint, bend = 0.18) {
  const midX = (source.position.x + target.position.x) / 2
  const midY = (source.position.y + target.position.y) / 2
  const dx = target.position.x - source.position.x
  const dy = target.position.y - source.position.y
  const normalX = -dy * bend
  const normalY = dx * bend

  return `M ${source.position.x} ${source.position.y} Q ${midX + normalX} ${midY + normalY} ${target.position.x} ${target.position.y}`
}

export function GraphEdges({ edges, nodes, clusters, brain, activeNodeId, width, height }: GraphEdgesProps) {
  const nodesById = new Map(nodes.map((node) => [node.id, node]))
  const clustersById = new Map(clusters.map((cluster) => [cluster.id, cluster]))

  return (
    <svg className="graph-edges" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      {clusters.map((cluster) => (
        <path
          key={`brain-${cluster.id}`}
          className="edge edge-brain-category"
          d={curvedPath(brain, cluster, 0.08)}
          style={{
            '--edge-color': cluster.color,
            opacity: 0.36 + cluster.depth * 0.26,
          } as CSSProperties}
        />
      ))}

      {nodes.flatMap((node) => {
        const categoryIds = node.categories?.length ? node.categories : [node.cluster]
        return categoryIds.map((categoryId) => {
          const cluster = clustersById.get(categoryId)
          if (!cluster) return null

          const isActive = activeNodeId === node.id
          return (
            <path
              key={`${node.id}-${categoryId}`}
              className={`edge edge-item-category ${isActive ? 'is-active' : ''}`}
              d={curvedPath(cluster, node, 0.13)}
              style={{
                '--edge-color': cluster.color,
                opacity: isActive ? 0.9 : 0.18 + ((node.depth + cluster.depth) / 2) * 0.26,
              } as CSSProperties}
            />
          )
        })
      })}

      {edges.map((edge) => {
        const source = nodesById.get(edge.source)
        const target = nodesById.get(edge.target)

        if (!source || !target) {
          return null
        }

        const isActive = activeNodeId === source.id || activeNodeId === target.id
        const averageDepth = (source.depth + target.depth) / 2

        return (
          <path
            key={`${edge.source}-${edge.target}`}
            className={`${edgeClassByType[edge.type]} edge-peer ${isActive ? 'is-active' : ''}`}
            d={curvedPath(source, target, 0.08)}
            style={{
              opacity: isActive ? 0.76 : 0.05 + averageDepth * 0.1,
            } as CSSProperties}
          />
        )
      })}
    </svg>
  )
}
