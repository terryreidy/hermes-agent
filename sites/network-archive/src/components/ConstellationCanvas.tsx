import type { ClusterItem, EdgeItem, NodeItem } from '../types'
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
  return (
    <section className="constellation-shell" aria-label="Spatial archive map">
      <div className="map-instructions">
        <span>002.au / working constellation</span>
        <span>click a node to inspect</span>
      </div>
      <div className="constellation-stage">
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
