import type { ClusterItem, NodeItem } from '../types'

interface MobileClusterListProps {
  clusters: ClusterItem[]
  nodes: NodeItem[]
  onSelect: (node: NodeItem) => void
}

export function MobileClusterList({ clusters, nodes, onSelect }: MobileClusterListProps) {
  return (
    <section className="mobile-clusters" aria-label="Clustered archive list">
      {clusters.map((cluster) => {
        const clusterNodes = nodes.filter((node) => node.cluster === cluster.id)
        return (
          <article className="mobile-cluster" key={cluster.id}>
            <p className="mobile-cluster-label">{cluster.label}</p>
            <div className="mobile-node-list">
              {clusterNodes.map((node) => (
                <button key={node.id} type="button" onClick={() => onSelect(node)}>
                  <span>{node.title}</span>
                  <small>{node.kind} · {node.tags.join(' / ')}</small>
                </button>
              ))}
            </div>
          </article>
        )
      })}
    </section>
  )
}
