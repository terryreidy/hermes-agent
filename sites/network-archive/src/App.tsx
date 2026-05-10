import type { CSSProperties } from 'react'
import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { AdminPage } from './components/AdminPage'
import { ConstellationCanvas } from './components/ConstellationCanvas'
import { DetailPanel } from './components/DetailPanel'
import { MobileClusterList } from './components/MobileClusterList'
import clustersData from './data/clusters.json'
import edgesData from './data/edges.json'
import nodesData from './data/nodes.json'
import type { ClusterItem, EdgeItem, NodeItem } from './types'

const initialNodes = nodesData as NodeItem[]
const edges = edgesData as EdgeItem[]
const clusters = clustersData as ClusterItem[]

function loadNodesFromBrowser() {
  if (typeof window === 'undefined') return initialNodes

  try {
    const storedNodes = window.localStorage.getItem('network-archive:nodes')
    return storedNodes ? (JSON.parse(storedNodes) as NodeItem[]) : initialNodes
  } catch {
    return initialNodes
  }
}

function App() {
  const [nodes, setNodes] = useState<NodeItem[]>(loadNodesFromBrowser)
  const [route, setRoute] = useState(() => (window.location.hash === '#admin' ? 'admin' : 'map'))
  const [selectedNode, setSelectedNode] = useState<NodeItem | undefined>()
  const [hoveredNodeId, setHoveredNodeId] = useState<string | undefined>()

  const activeNodeId = hoveredNodeId ?? selectedNode?.id

  const nodeCountByCluster = useMemo(() => {
    return clusters.map((cluster) => ({
      ...cluster,
      count: nodes.filter((node) => (node.categories?.length ? node.categories : [node.cluster]).includes(cluster.id)).length,
    }))
  }, [nodes])

  useEffect(() => {
    window.localStorage.setItem('network-archive:nodes', JSON.stringify(nodes))
  }, [nodes])

  useEffect(() => {
    const syncRoute = () => setRoute(window.location.hash === '#admin' ? 'admin' : 'map')
    window.addEventListener('hashchange', syncRoute)
    return () => window.removeEventListener('hashchange', syncRoute)
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

  if (route === 'admin') {
    return (
      <AdminPage
        clusters={clusters}
        nodes={nodes}
        onNodesChange={setNodes}
        onBack={() => {
          window.location.hash = ''
          setRoute('map')
        }}
      />
    )
  }

  return (
    <main className="archive-page">
      <header className="top-banner">
        <div className="banner-title-block">
          <p className="eyebrow">My personal hivemind</p>
          <h1>002.au</h1>
        </div>
        <div className="banner-copy-block">
          <p className="intro">
            A prototype for a spatial archive: posts, links, notes, news, projects, and odd little
            signals arranged as a map instead of a feed.
          </p>
          <div className="banner-actions">
            <a href="#admin">admin</a>
          </div>
          <div className="cluster-readout" aria-label="Archive clusters">
            {nodeCountByCluster.map((cluster) => (
              <span key={cluster.id} style={{ '--cluster-color': cluster.color } as CSSProperties}>
                {cluster.label} [{cluster.count}]
              </span>
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

      {selectedNode ? (
        <DetailPanel key={selectedNode.id} node={selectedNode} onClose={() => setSelectedNode(undefined)} />
      ) : null}

      <MobileClusterList clusters={clusters} nodes={nodes} onSelect={setSelectedNode} />
    </main>
  )
}

export default App
