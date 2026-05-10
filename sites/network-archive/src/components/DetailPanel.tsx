import type { NodeItem } from '../types'
import { useDraggablePanel } from '../hooks/useDraggablePanel'

interface DetailPanelProps {
  node: NodeItem
  onClose: () => void
}

export function DetailPanel({ node, onClose }: DetailPanelProps) {
  const { panelRef, style, isDragging, onHandlePointerDown } = useDraggablePanel<HTMLElement>(node.position)

  return (
    <aside
      ref={panelRef}
      className={`detail-panel ${isDragging ? 'is-dragging' : ''}`}
      style={style}
      aria-label={`${node.title} details`}
    >
      <button type="button" className="panel-close" onClick={onClose} aria-label="Close detail panel">
        ×
      </button>
      <div className="panel-drag-handle" onPointerDown={onHandlePointerDown} role="presentation">
        <p className="panel-kicker">{node.kind} / {node.cluster}</p>
        <span className="panel-grip" aria-hidden="true">drag</span>
      </div>
      <div className="panel-content">
        <h2>{node.title}</h2>
        <p className="panel-summary">{node.summary}</p>
        <div className="panel-tags" aria-label="Tags">
          {node.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        {node.date ? <p className="panel-date">logged {node.date}</p> : null}
        {node.url ? (
          <a className="panel-link" href={node.url} target="_blank" rel="noreferrer">
            open source ↗
          </a>
        ) : (
          <p className="panel-muted">No external source yet. This one lives here for now.</p>
        )}
      </div>
    </aside>
  )
}
