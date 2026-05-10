import type { ChangeEvent, CSSProperties, FormEvent } from 'react'
import { useMemo, useState } from 'react'
import './AdminPage.css'
import type { ClusterItem, NodeItem, NodeKind, NodeSize } from '../types'

export interface StorageStatus {
  tone: 'loading' | 'ready' | 'saving' | 'saved' | 'error'
  message: string
  filePath?: string
}

interface AdminPageProps {
  clusters: ClusterItem[]
  nodes: NodeItem[]
  onNodesChange: (nodes: NodeItem[]) => void
  onReloadFromDisk: () => void
  onBack: () => void
  storageStatus: StorageStatus
}

const nodeKinds: NodeKind[] = ['post', 'link', 'note', 'project', 'news', 'person', 'tool']
const nodeSizes: NodeSize[] = ['small', 'medium', 'large']

const emptyDraft: NodeItem = {
  id: '',
  title: '',
  kind: 'note',
  summary: '',
  cluster: 'ai',
  categories: ['ai'],
  tags: [],
  size: 'medium',
  detail: '',
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function tagsToText(tags: string[]) {
  return tags.join(', ')
}

function textToTags(value: string) {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

function categoryNames(node: NodeItem, clusters: ClusterItem[]) {
  const selected = node.categories?.length ? node.categories : [node.cluster]
  return selected
    .map((id) => clusters.find((cluster) => cluster.id === id)?.label ?? id)
    .join(' / ')
}

function normalizeImportedNode(node: NodeItem, clusters: ClusterItem[]): NodeItem {
  const fallbackCluster = clusters[0]?.id ?? 'ai'
  const categories = node.categories?.length ? node.categories : [node.cluster || fallbackCluster]

  return {
    ...node,
    id: node.id || slugify(node.title) || `node-${Date.now()}`,
    cluster: categories[0] ?? fallbackCluster,
    categories,
    tags: Array.isArray(node.tags) ? node.tags : [],
    size: node.size ?? 'medium',
    kind: node.kind ?? 'note',
    summary: node.summary ?? '',
  }
}

function stripGeneratedFieldsForExport(nodes: NodeItem[]) {
  return nodes.map((node) => {
    const exportedNode = { ...node }
    delete exportedNode.position
    return exportedNode
  })
}

export function AdminPage({ clusters, nodes, onNodesChange, onReloadFromDisk, onBack, storageStatus }: AdminPageProps) {
  const [selectedId, setSelectedId] = useState(nodes[0]?.id ?? 'new')
  const selectedNode = nodes.find((node) => node.id === selectedId)
  const [draft, setDraft] = useState<NodeItem>(selectedNode ?? { ...emptyDraft, cluster: clusters[0]?.id ?? 'ai', categories: [clusters[0]?.id ?? 'ai'] })
  const [jsonVisible, setJsonVisible] = useState(false)

  const sortedNodes = useMemo(() => {
    return [...nodes].sort((a, b) => a.title.localeCompare(b.title))
  }, [nodes])

  const draftCategories = draft.categories?.length ? draft.categories : [draft.cluster]
  const canSave = draft.title.trim() && draft.summary.trim() && draftCategories.length > 0
  const exportedJson = JSON.stringify(stripGeneratedFieldsForExport(nodes), null, 2)

  const selectNode = (node: NodeItem) => {
    setSelectedId(node.id)
    setDraft({ ...node, categories: node.categories?.length ? node.categories : [node.cluster] })
  }

  const createNew = () => {
    const primaryCluster = clusters[0]?.id ?? 'ai'
    setSelectedId('new')
    setDraft({ ...emptyDraft, cluster: primaryCluster, categories: [primaryCluster] })
  }

  const toggleCategory = (categoryId: string) => {
    const nextCategories = draftCategories.includes(categoryId)
      ? draftCategories.filter((id) => id !== categoryId)
      : [...draftCategories, categoryId]
    const fallbackCategories = nextCategories.length ? nextCategories : [categoryId]

    setDraft({
      ...draft,
      categories: fallbackCategories,
      cluster: fallbackCategories[0],
    })
  }

  const saveDraft = (event?: FormEvent) => {
    event?.preventDefault()
    if (!canSave) return

    const id = draft.id || slugify(draft.title) || `node-${Date.now()}`
    const normalizedDraft: NodeItem = {
      ...draft,
      id,
      title: draft.title.trim(),
      summary: draft.summary.trim(),
      url: draft.url?.trim() || undefined,
      date: draft.date?.trim() || undefined,
      tags: draft.tags.map((tag) => tag.trim()).filter(Boolean),
      categories: draftCategories,
      cluster: draftCategories[0],
      detail: draft.detail?.trim() || undefined,
    }
    const nextNodes = nodes.some((node) => node.id === id)
      ? nodes.map((node) => (node.id === id ? normalizedDraft : node))
      : [...nodes, normalizedDraft]

    onNodesChange(nextNodes)
    setSelectedId(id)
    setDraft(normalizedDraft)
  }

  const deleteDraft = () => {
    if (!selectedNode) return
    const nextNodes = nodes.filter((node) => node.id !== selectedNode.id)
    onNodesChange(nextNodes)
    const nextSelected = nextNodes[0]
    if (nextSelected) {
      selectNode(nextSelected)
    } else {
      createNew()
    }
  }

  const reloadFromJsonFile = () => {
    onReloadFromDisk()
  }

  const duplicateDraft = () => {
    const cloneId = `${draft.id || slugify(draft.title) || 'node'}-copy-${Date.now().toString().slice(-4)}`
    const clone: NodeItem = {
      ...draft,
      id: cloneId,
      title: `${draft.title || 'Untitled object'} copy`,
    }
    onNodesChange([...nodes, clone])
    setSelectedId(cloneId)
    setDraft(clone)
  }

  const downloadNodesJson = () => {
    const blob = new Blob([exportedJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'nodes.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  const importNodesJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const imported = JSON.parse(await file.text()) as NodeItem[]
      if (!Array.isArray(imported)) return
      const normalizedNodes = imported.map((node) => normalizeImportedNode(node, clusters))
      onNodesChange(normalizedNodes)
      const firstNode = normalizedNodes[0]
      if (firstNode) {
        setSelectedId(firstNode.id)
        setDraft(firstNode)
      } else {
        createNew()
      }
    } finally {
      event.target.value = ''
    }
  }

  return (
    <main className="admin-page">
      <header className="admin-topbar">
        <button type="button" className="admin-back" onClick={onBack}>← map</button>
        <div>
          <p className="eyebrow">Node admin</p>
          <h1>content console</h1>
        </div>
        <p className="admin-note">
          Edit freely here. Each save writes directly to the local source file; when you want it published, tell Hyun to push this JSON to the preview branch.
        </p>
      </header>

      <section className="admin-layout">
        <aside className="admin-node-list" aria-label="Existing nodes">
          <div className="admin-list-heading">
            <span>{nodes.length} nodes</span>
            <button type="button" onClick={createNew}>+ new</button>
          </div>
          <div className="admin-file-actions">
            <button type="button" onClick={reloadFromJsonFile}>reload from disk</button>
            <button type="button" onClick={downloadNodesJson}>download backup</button>
            <label>
              import nodes.json
              <input type="file" accept="application/json,.json" onChange={importNodesJson} />
            </label>
          </div>
          <div className={`admin-storage-status is-${storageStatus.tone}`}>
            <strong>{storageStatus.message}</strong>
            {storageStatus.filePath ? <small>{storageStatus.filePath}</small> : null}
          </div>
          {sortedNodes.map((node) => (
            <button
              key={node.id}
              type="button"
              className={`admin-node-row ${node.id === selectedId ? 'is-selected' : ''}`}
              onClick={() => selectNode(node)}
            >
              <span>{node.title}</span>
              <small>{node.kind} · {categoryNames(node, clusters)}</small>
            </button>
          ))}
        </aside>

        <form className="admin-editor" onSubmit={saveDraft}>
          <div className="admin-editor-title">
            <div>
              <p className="panel-kicker">{selectedNode ? 'edit node' : 'new node'}</p>
              <h2>{draft.title || 'Untitled object'}</h2>
            </div>
            <div className="admin-actions">
              {selectedNode ? <button type="button" onClick={duplicateDraft}>duplicate</button> : null}
              {selectedNode ? <button type="button" className="danger-button" onClick={deleteDraft}>delete</button> : null}
              <button type="button" disabled={!canSave || storageStatus.tone === 'saving'} onClick={() => saveDraft()}>{storageStatus.tone === 'saving' ? 'saving…' : 'save to nodes.json'}</button>
            </div>
          </div>

          <label>
            <span>Title</span>
            <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="A useful thought, link, article, post…" />
          </label>

          <div className="admin-two-col">
            <label>
              <span>Type</span>
              <select value={draft.kind} onChange={(event) => setDraft({ ...draft, kind: event.target.value as NodeKind })}>
                {nodeKinds.map((kind) => <option key={kind} value={kind}>{kind}</option>)}
              </select>
            </label>
            <label>
              <span>Visual weight</span>
              <select value={draft.size} onChange={(event) => setDraft({ ...draft, size: event.target.value as NodeSize })}>
                {nodeSizes.map((size) => <option key={size} value={size}>{size}</option>)}
              </select>
            </label>
          </div>

          <label>
            <span>Source URL</span>
            <input value={draft.url ?? ''} onChange={(event) => setDraft({ ...draft, url: event.target.value })} placeholder="https://… optional" />
          </label>

          <label>
            <span>Detail page summary</span>
            <textarea rows={3} value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} placeholder="The short paragraph that appears first in the detail card." />
          </label>

          <label>
            <span>Detail page body</span>
            <textarea rows={7} value={draft.detail ?? ''} onChange={(event) => setDraft({ ...draft, detail: event.target.value })} placeholder="Longer notes for the detail panel. Use short paragraphs; blank lines become spacing." />
          </label>

          <div className="admin-two-col">
            <label>
              <span>Tags</span>
              <input value={tagsToText(draft.tags)} onChange={(event) => setDraft({ ...draft, tags: textToTags(event.target.value) })} placeholder="AI, archive, Melbourne" />
            </label>
            <label>
              <span>Date</span>
              <input value={draft.date ?? ''} onChange={(event) => setDraft({ ...draft, date: event.target.value })} placeholder="YYYY-MM-DD" />
            </label>
          </div>

          <fieldset className="category-picker">
            <legend>Category links</legend>
            <p>Pick one or more. The first selected category becomes the primary cluster for sorting; all selected categories draw graph links.</p>
            <div>
              {clusters.map((cluster) => (
                <button
                  key={cluster.id}
                  type="button"
                  className={draftCategories.includes(cluster.id) ? 'is-selected' : ''}
                  style={{ '--category-color': cluster.color } as CSSProperties}
                  onClick={() => toggleCategory(cluster.id)}
                >
                  {cluster.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="position-picker">
            <legend>Map placement</legend>
            <p>Automatic. Category links, item count, visual weight, and cross-links determine the constellation layout.</p>
          </fieldset>
        </form>

        <aside className="admin-preview">
          <p className="panel-kicker">detail preview</p>
          <article>
            <h2>{draft.title || 'Untitled object'}</h2>
            <p>{draft.summary || 'Summary appears here.'}</p>
            {draft.detail ? <div className="admin-preview-body">{draft.detail.split('\n\n').map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div> : null}
            <div className="panel-tags">
              {draft.tags.map((tag) => <span key={tag}>{tag}</span>)}
            </div>
          </article>
          <button type="button" className="admin-json-toggle" onClick={() => setJsonVisible(!jsonVisible)}>
            {jsonVisible ? 'hide JSON snapshot' : 'show JSON snapshot'}
          </button>
          {jsonVisible ? <textarea className="json-export" readOnly value={exportedJson} /> : null}
          <button type="button" className="admin-reset" onClick={reloadFromJsonFile}>discard unsaved form changes / reload file</button>
        </aside>
      </section>
    </main>
  )
}
