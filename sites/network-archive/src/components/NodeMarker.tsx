import type { CSSProperties } from 'react'
import type { NodeItem } from '../types'

export interface ProjectedNode extends Omit<NodeItem, 'position'> {
  position: {
    x: number
    y: number
  }
  depth: number
  visualScale: number
  visualOpacity: number
  labelSide: 'left' | 'right'
}

interface NodeMarkerProps {
  node: ProjectedNode
  isActive: boolean
  onSelect: (node: NodeItem) => void
  onHover: (nodeId?: string) => void
}

const kindLabel: Record<NodeItem['kind'], string> = {
  post: 'post',
  link: 'link',
  note: 'note',
  project: 'project',
  news: 'news',
  person: 'person',
  tool: 'tool',
}

export function NodeMarker({ node, isActive, onSelect, onHover }: NodeMarkerProps) {
  const markerTransform = node.labelSide === 'left'
    ? `translate(calc(-100% + 9px), -9px) scale(${node.visualScale})`
    : `translate(-9px, -9px) scale(${node.visualScale})`

  return (
    <button
      type="button"
      className={`node-marker node-${node.size} node-label-${node.labelSide} ${isActive ? 'is-active' : ''}`}
      style={{
        left: node.position.x,
        top: node.position.y,
        opacity: node.visualOpacity,
        transform: markerTransform,
        zIndex: Math.round(20 + node.depth * 20),
      } as CSSProperties}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation()
        onSelect(node)
      }}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(undefined)}
      onFocus={() => onHover(node.id)}
      onBlur={() => onHover(undefined)}
      aria-label={`Open ${node.title}`}
    >
      <span className="node-dot" aria-hidden="true" />
      <span className="node-copy">
        <span className="node-title">{node.title}</span>
        <span className="node-meta">{kindLabel[node.kind]} · {node.tags.slice(0, 2).join(' / ')}</span>
      </span>
    </button>
  )
}
