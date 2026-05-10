import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './App.css'
import { AdminPage, type StorageStatus } from './components/AdminPage'
import clustersData from './data/clusters.json'
import fallbackNodesData from './data/nodes.json'
import type { ClusterItem, NodeItem } from './types'

const clusters = clustersData as ClusterItem[]
const fallbackNodes = fallbackNodesData as NodeItem[]

interface NodesApiResponse {
  ok: boolean
  path?: string
  nodes?: NodeItem[]
  count?: number
  savedAt?: string
  error?: string
}

function localTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

async function fetchNodesFromDisk() {
  const response = await fetch('/api/nodes', { cache: 'no-store' })
  const payload = (await response.json()) as NodesApiResponse

  if (!response.ok || !payload.ok || !payload.nodes) {
    throw new Error(payload.error ?? 'Could not load nodes.json')
  }

  return payload
}

async function saveNodesToDisk(nodes: NodeItem[]) {
  const cleanNodes = nodes.map((node) => {
    const exportedNode = { ...node }
    delete exportedNode.position
    return exportedNode
  })

  const response = await fetch('/api/nodes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nodes: cleanNodes }),
  })
  const payload = (await response.json()) as NodesApiResponse

  if (!response.ok || !payload.ok) {
    throw new Error(payload.error ?? 'Could not save nodes.json')
  }

  return payload
}

export function AdminApp() {
  const [nodes, setNodes] = useState<NodeItem[] | null>(null)
  const [adminKey, setAdminKey] = useState(0)
  const [storageStatus, setStorageStatus] = useState<StorageStatus>({
    tone: 'loading',
    message: 'Loading nodes.json from disk…',
  })

  const reloadFromDisk = async () => {
    setStorageStatus({ tone: 'loading', message: 'Loading nodes.json from disk…' })
    try {
      const payload = await fetchNodesFromDisk()
      setNodes(payload.nodes ?? [])
      setAdminKey((key) => key + 1)
      setStorageStatus({
        tone: 'ready',
        message: `Loaded ${payload.nodes?.length ?? 0} nodes from local JSON`,
        filePath: payload.path,
      })
    } catch (error) {
      setNodes(fallbackNodes)
      setAdminKey((key) => key + 1)
      setStorageStatus({
        tone: 'error',
        message: error instanceof Error
          ? `${error.message}. Run “npm run admin” so this page can write to disk.`
          : 'Could not reach the local admin API. Run “npm run admin”.',
      })
    }
  }

  useEffect(() => {
    void reloadFromDisk()
  }, [])

  const persistNodes = async (nextNodes: NodeItem[]) => {
    setNodes(nextNodes)
    setStorageStatus((current) => ({ ...current, tone: 'saving', message: 'Saving nodes.json to disk…' }))

    try {
      const payload = await saveNodesToDisk(nextNodes)
      setStorageStatus({
        tone: 'saved',
        message: `Saved ${payload.count ?? nextNodes.length} nodes${payload.savedAt ? ` at ${localTime(payload.savedAt)}` : ''}`,
        filePath: payload.path,
      })
    } catch (error) {
      setStorageStatus((current) => ({
        ...current,
        tone: 'error',
        message: error instanceof Error ? error.message : 'Could not save nodes.json',
      }))
    }
  }

  if (!nodes) {
    return (
      <main className="admin-page admin-page-loading">
        <p className="eyebrow">Node admin</p>
        <h1>content console</h1>
        <p>{storageStatus.message}</p>
      </main>
    )
  }

  return (
    <AdminPage
      key={adminKey}
      clusters={clusters}
      nodes={nodes}
      onNodesChange={(nextNodes) => {
        void persistNodes(nextNodes)
      }}
      onReloadFromDisk={() => {
        void reloadFromDisk()
      }}
      onBack={() => {
        window.location.href = '/'
      }}
      storageStatus={storageStatus}
    />
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AdminApp />
  </StrictMode>,
)
