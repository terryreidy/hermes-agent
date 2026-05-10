import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './App.css'
import { AdminPage } from './components/AdminPage'
import clustersData from './data/clusters.json'
import nodesData from './data/nodes.json'
import type { ClusterItem, NodeItem } from './types'

const initialNodes = nodesData as NodeItem[]
const clusters = clustersData as ClusterItem[]

function loadNodesFromBrowser() {
  try {
    const storedNodes = window.localStorage.getItem('network-archive:admin-nodes')
    return storedNodes ? (JSON.parse(storedNodes) as NodeItem[]) : initialNodes
  } catch {
    return initialNodes
  }
}

export function AdminApp() {
  const [nodes, setNodes] = useState<NodeItem[]>(loadNodesFromBrowser)

  useEffect(() => {
    window.localStorage.setItem('network-archive:admin-nodes', JSON.stringify(nodes))
  }, [nodes])

  return (
    <AdminPage
      clusters={clusters}
      nodes={nodes}
      onNodesChange={setNodes}
      onBack={() => {
        window.location.href = '/'
      }}
    />
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AdminApp />
  </StrictMode>,
)
