import type { CSSProperties } from 'react'
import type { ClusterItem, EdgeItem, NodeItem } from '../types'
import { useCanvasPan } from '../hooks/useCanvasPan'
import { GraphEdges } from './GraphEdges'
import { NodeMarker } from './NodeMarker'

interface ConstellationCanvasProps {
  clusters: ClusterItem[]
  edges: EdgeItem[]
  nodes: NodeItem[]
  activeNodeId?: string
  onSelectNode: (node: NodeItem) => void
  onHoverNode: (nodeId?: string) => void
}

export function ConstellationCanvas({
  clusters,
  edges,
  nodes,
  activeNodeId,
  onSelectNode,
  onHoverNode,
}: ConstellationCanvasProps) {
  const { pan, isPanning, resetPan, canvasHandlers } = useCanvasPan()

  return (
    <section
      className={`constellation-shell ${isPanning ? 'is-panning' : ''}`}
      aria-label="Spatial archive map"
      {...canvasHandlers}
    >
      <div className="map-instructions">
        <span>002.au / working constellation</span>
        <span>drag empty space to pan · click a node to inspect</span>
      </div>
      <button type="button" className="pan-reset" onClick={resetPan} data-no-canvas-pan="true">
        reset pan
      </button>
      <div
        className="constellation-stage"
        style={{ '--pan-x': `${pan.x}px`, '--pan-y': `${pan.y}px` } as CSSProperties}
      >
        <div className="coordinate-grid" aria-hidden="true" />
        {clusters.map((cluster) => (
          <div
            key={cluster.id}
            className={`cluster-label cluster-${cluster.id}`}
            style={{ left: cluster.origin.x, top: cluster.origin.y }}
          >
            <span>{cluster.label}</span>
            <small>{cluster.description}</small>
          </div>
        ))}
        <GraphEdges edges={edges} nodes={nodes} activeNodeId={activeNodeId} />
        {nodes.map((node) => (
          <NodeMarker
            key={node.id}
            node={node}
            isActive={node.id === activeNodeId}
            onSelect={onSelectNode}
            onHover={onHoverNode}
          />
        ))}
        <div className="wireframe wireframe-one" aria-hidden="true">
          <span />
        </div>
        <div className="wireframe wireframe-two" aria-hidden="true">
          <span />
        </div>
      </div>
    </section>
  )
}
