import type { ClusterItem, EdgeItem, NodeItem } from '../types'

export const SOURCE_WIDTH = 1500
export const SOURCE_HEIGHT = 1350
export const SOURCE_CENTER = { x: SOURCE_WIDTH / 2, y: 610 }

const CATEGORY_RING_RADIUS_X = 370
const CATEGORY_RING_RADIUS_Y = 330
const CATEGORY_SAFE_MARGIN_X = 170
const CATEGORY_SAFE_MARGIN_Y = 145
const ITEM_OUTER_GAP = 390
const MULTI_CATEGORY_OUTER_GAP = 300
const SIBLING_TANGENT_GAP = 165
const SIBLING_RADIAL_STAGGER = 34
const ITEM_ANCHOR_PULL = 0.006
const MIN_X = 92
const MAX_X = SOURCE_WIDTH - 92
const MIN_Y = 92
const MAX_Y = SOURCE_HEIGHT - 92

type LayoutNodeInput = Omit<NodeItem, 'position'> & Partial<Pick<NodeItem, 'position'>>
type LayoutClusterInput = Omit<ClusterItem, 'origin'> & Partial<Pick<ClusterItem, 'origin'>>

export interface AutoLayoutInput {
  clusters: LayoutClusterInput[]
  nodes: LayoutNodeInput[]
  edges: EdgeItem[]
}

export type PositionedClusterItem = Omit<ClusterItem, 'origin'> & {
  origin: Point
}

export type PositionedNodeItem = Omit<NodeItem, 'position'> & {
  position: Point
}

export interface AutoLayoutResult {
  clusters: PositionedClusterItem[]
  nodes: PositionedNodeItem[]
}

interface Point {
  x: number
  y: number
}

interface SimNode {
  node: LayoutNodeInput
  position: Point
  velocity: Point
  anchor: Point
  weight: number
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function stableHash(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function sortByStableIdentity<T extends { id: string; title?: string }>(items: T[]) {
  return [...items].sort((a, b) => `${a.title ?? ''}:${a.id}`.localeCompare(`${b.title ?? ''}:${b.id}`))
}

function categoryIdsForNode(node: LayoutNodeInput) {
  return node.categories?.length ? node.categories : [node.cluster]
}

function averagePoint(points: Point[]) {
  if (!points.length) {
    return SOURCE_CENTER
  }

  const total = points.reduce(
    (accumulator, point) => ({ x: accumulator.x + point.x, y: accumulator.y + point.y }),
    { x: 0, y: 0 },
  )
  return { x: total.x / points.length, y: total.y / points.length }
}

function normalizeVector(vector: Point, fallbackAngle: number) {
  const length = Math.hypot(vector.x, vector.y)
  if (length < 0.001) {
    return { x: Math.cos(fallbackAngle), y: Math.sin(fallbackAngle) }
  }
  return { x: vector.x / length, y: vector.y / length }
}

function pointFromCenter(direction: Point, distance: number, origin = SOURCE_CENTER): Point {
  return {
    x: origin.x + direction.x * distance,
    y: origin.y + direction.y * distance,
  }
}

function nodeRadius(node: LayoutNodeInput) {
  if (node.size === 'large') return 120
  if (node.size === 'small') return 78
  return 96
}

function createClusterLayout(clusters: LayoutClusterInput[]): PositionedClusterItem[] {
  const orderedClusters = sortByStableIdentity(clusters)
  const angleStep = (Math.PI * 2) / Math.max(orderedClusters.length, 1)
  const startAngle = -Math.PI / 2

  return orderedClusters.map((cluster, index) => {
    const angle = startAngle + index * angleStep
    const generatedOrigin = {
      x: SOURCE_CENTER.x + Math.cos(angle) * CATEGORY_RING_RADIUS_X,
      y: SOURCE_CENTER.y + Math.sin(angle) * CATEGORY_RING_RADIUS_Y,
    }

    return {
      ...cluster,
      origin: {
        x: clamp(generatedOrigin.x, MIN_X + CATEGORY_SAFE_MARGIN_X, MAX_X - CATEGORY_SAFE_MARGIN_X),
        y: clamp(generatedOrigin.y, MIN_Y + CATEGORY_SAFE_MARGIN_Y, MAX_Y - CATEGORY_SAFE_MARGIN_Y),
      },
    }
  })
}

function initialNodePosition(
  node: LayoutNodeInput,
  nodeIndex: number,
  siblingCount: number,
  clustersById: Map<string, ClusterItem>,
) {
  const linkedClusters = categoryIdsForNode(node)
    .map((categoryId) => clustersById.get(categoryId))
    .filter((cluster): cluster is PositionedClusterItem => Boolean(cluster))

  const rawAnchor = averagePoint(linkedClusters.map((cluster) => cluster.origin))
  const fallbackAngle = (stableHash(node.id) / 2 ** 32) * Math.PI * 2
  const rawDirection = normalizeVector({ x: rawAnchor.x - SOURCE_CENTER.x, y: rawAnchor.y - SOURCE_CENTER.y }, fallbackAngle)
  const innerAnchor = Math.hypot(rawAnchor.x - SOURCE_CENTER.x, rawAnchor.y - SOURCE_CENTER.y) < 90
    ? pointFromCenter(rawDirection, 180)
    : rawAnchor
  const outward = normalizeVector({ x: innerAnchor.x - SOURCE_CENTER.x, y: innerAnchor.y - SOURCE_CENTER.y }, fallbackAngle)
  const tangent = { x: -outward.y, y: outward.x }
  const siblingOffset = nodeIndex - (siblingCount - 1) / 2
  const jitter = ((stableHash(`${node.id}:jitter`) % 1000) / 1000 - 0.5) * 42
  const radialGap = linkedClusters.length > 1 ? MULTI_CATEGORY_OUTER_GAP : ITEM_OUTER_GAP
  const radialStagger = (Math.abs(siblingOffset) % 3) * SIBLING_RADIAL_STAGGER
  const tangentSpread = siblingOffset * SIBLING_TANGENT_GAP
  const anchor = {
    x: innerAnchor.x + outward.x * radialGap,
    y: innerAnchor.y + outward.y * radialGap,
  }

  return {
    anchor,
    position: {
      x: anchor.x + outward.x * (jitter + radialStagger) + tangent.x * tangentSpread,
      y: anchor.y + outward.y * (jitter + radialStagger) + tangent.y * tangentSpread,
    },
  }
}

function relaxNodes(simNodes: SimNode[], edges: EdgeItem[]) {
  const nodesById = new Map(simNodes.map((simNode) => [simNode.node.id, simNode]))

  for (let iteration = 0; iteration < 120; iteration += 1) {
    const cooling = 1 - iteration / 120

    for (let leftIndex = 0; leftIndex < simNodes.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < simNodes.length; rightIndex += 1) {
        const left = simNodes[leftIndex]
        const right = simNodes[rightIndex]
        const dx = right.position.x - left.position.x
        const dy = right.position.y - left.position.y
        const distance = Math.max(1, Math.hypot(dx, dy))
        const wanted = nodeRadius(left.node) + nodeRadius(right.node)

        if (distance < wanted) {
          const force = ((wanted - distance) / distance) * 0.09 * cooling
          const fx = dx * force
          const fy = dy * force
          left.velocity.x -= fx
          left.velocity.y -= fy
          right.velocity.x += fx
          right.velocity.y += fy
        }
      }
    }

    for (const simNode of simNodes) {
      simNode.velocity.x += (simNode.anchor.x - simNode.position.x) * ITEM_ANCHOR_PULL * simNode.weight
      simNode.velocity.y += (simNode.anchor.y - simNode.position.y) * ITEM_ANCHOR_PULL * simNode.weight
    }

    for (const edge of edges) {
      const source = nodesById.get(edge.source)
      const target = nodesById.get(edge.target)
      if (!source || !target) continue

      const dx = target.position.x - source.position.x
      const dy = target.position.y - source.position.y
      const distance = Math.max(1, Math.hypot(dx, dy))
      const wanted = 280
      const force = ((distance - wanted) / distance) * 0.0018
      const fx = dx * force
      const fy = dy * force
      source.velocity.x += fx
      source.velocity.y += fy
      target.velocity.x -= fx
      target.velocity.y -= fy
    }

    for (const simNode of simNodes) {
      simNode.velocity.x *= 0.72
      simNode.velocity.y *= 0.72
      simNode.position.x = clamp(simNode.position.x + simNode.velocity.x, MIN_X, MAX_X)
      simNode.position.y = clamp(simNode.position.y + simNode.velocity.y, MIN_Y, MAX_Y)
    }
  }
}

export function computeAutoLayout({ clusters, nodes, edges }: AutoLayoutInput): AutoLayoutResult {
  const layoutClusters = createClusterLayout(clusters)
  const clustersById = new Map(layoutClusters.map((cluster) => [cluster.id, cluster]))
  const nodesByPrimaryCluster = new Map<string, LayoutNodeInput[]>()

  for (const node of sortByStableIdentity(nodes)) {
    const primaryCluster = categoryIdsForNode(node)[0] ?? layoutClusters[0]?.id ?? 'default'
    const siblings = nodesByPrimaryCluster.get(primaryCluster) ?? []
    siblings.push(node)
    nodesByPrimaryCluster.set(primaryCluster, siblings)
  }

  const simNodes: SimNode[] = []
  for (const [primaryCluster, siblings] of nodesByPrimaryCluster) {
    const orderedSiblings = sortByStableIdentity(siblings)
    orderedSiblings.forEach((node, index) => {
      const { anchor, position } = initialNodePosition(node, index, orderedSiblings.length, clustersById)
      simNodes.push({
        node: { ...node, cluster: primaryCluster },
        position,
        velocity: { x: 0, y: 0 },
        anchor,
        weight: categoryIdsForNode(node).length > 1 ? 1.4 : 0.92,
      })
    })
  }

  relaxNodes(simNodes, edges)

  return {
    clusters: layoutClusters,
    nodes: nodes.map((node) => {
      const simNode = simNodes.find((candidate) => candidate.node.id === node.id)
      return {
        ...node,
        position: {
          x: Math.round(simNode?.position.x ?? SOURCE_CENTER.x),
          y: Math.round(simNode?.position.y ?? SOURCE_CENTER.y),
        },
      }
    }),
  }
}
