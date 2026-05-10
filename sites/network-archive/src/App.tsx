import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { ConstellationCanvas } from './components/ConstellationCanvas'
import { DetailPanel } from './components/DetailPanel'
import { MobileClusterList } from './components/MobileClusterList'
import clustersData from './data/clusters.json'
import edgesData from './data/edges.json'
import nodesData from './data/nodes.json'
import type { ClusterItem, EdgeItem, NodeItem } from './types'

const nodes = nodesData as NodeItem[]
const edges = edgesData as EdgeItem[]
const clusters = clustersData as ClusterItem[]

function App() {
  const [selectedNode, setSelectedNode] = useState<NodeItem | undefined>()
  const [hoveredNodeId, setHoveredNodeId] = useState<string | undefined>()

  const activeNodeId = hoveredNodeId ?? selectedNode?.id

  const nodeCountByCluster = useMemo(() => {
    return clusters.map((cluster) => ({
      ...cluster,
      count: nodes.filter((node) => node.cluster === cluster.id).length,
    }))
  }, [])

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedNode(undefined)
      }
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [])

  return (
    <main className="archive-page">
      <header className="top-banner">
        <div className="banner-title-block">
          <p className="eyebrow">Ok so I guess this is</p>
          <h1>002.au</h1>
        </div>
        <div className="banner-copy-block">
          <p className="intro">
            A prototype for a spatial archive: posts, links, notes, news, projects, and odd little
            signals arranged as a map instead of a feed.
          </p>
          <div className="cluster-readout" aria-label="Archive clusters">
            {nodeCountByCluster.map((cluster) => (
              <span key={cluster.id}>{cluster.label} [{cluster.count}]</span>
            ))}
          </div>
        </div>
      </header>

      <div className="map-viewport">
        <ConstellationCanvas
          clusters={clusters}
          edges={edges}
          nodes={nodes}
          activeNodeId={activeNodeId}
          onSelectNode={setSelectedNode}
          onHoverNode={setHoveredNodeId}
        />
      </div>

      {selectedNode ? <DetailPanel node={selectedNode} onClose={() => setSelectedNode(undefined)} /> : null}

      <MobileClusterList clusters={clusters} nodes={nodes} onSelect={setSelectedNode} />
    </main>
  )
}

export default App
