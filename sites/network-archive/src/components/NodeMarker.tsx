import type { NodeItem } from '../types'

interface NodeMarkerProps {
  node: NodeItem
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
  return (
    <button
      type="button"
      className={`node-marker node-${node.size} ${isActive ? 'is-active' : ''}`}
      style={{ left: node.position.x, top: node.position.y }}
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
