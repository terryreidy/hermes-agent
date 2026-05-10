export type NodeKind = 'post' | 'link' | 'note' | 'project' | 'news' | 'person' | 'tool'

export type NodeSize = 'small' | 'medium' | 'large'

export interface NodeItem {
  id: string
  title: string
  kind: NodeKind
  url?: string
  summary: string
  cluster: string
  tags: string[]
  date?: string
  position: {
    x: number
    y: number
  }
  size: NodeSize
}

export interface EdgeItem {
  source: string
  target: string
  type: 'related' | 'inspired-by' | 'follow-up' | 'contrast'
}

export interface ClusterItem {
  id: string
  label: string
  description: string
  origin: {
    x: number
    y: number
  }
}
