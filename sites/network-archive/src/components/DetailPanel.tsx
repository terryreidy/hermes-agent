import type { NodeItem } from '../types'

interface DetailPanelProps {
  node?: NodeItem
  onClose: () => void
}

export function DetailPanel({ node, onClose }: DetailPanelProps) {
  if (!node) {
    return (
      <aside className="detail-panel detail-panel-empty" aria-label="Selected node details">
        <p className="panel-kicker">select a point</p>
        <p>Hover the field. Click a square. The map becomes an index of things worth keeping.</p>
      </aside>
    )
  }

  return (
    <aside className="detail-panel" aria-label={`${node.title} details`}>
      <button type="button" className="panel-close" onClick={onClose} aria-label="Close detail panel">
        ×
      </button>
      <p className="panel-kicker">{node.kind} / {node.cluster}</p>
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
    </aside>
  )
}
