import assert from 'node:assert/strict'
import test from 'node:test'

import { computeAutoLayout, SOURCE_CENTER, SOURCE_HEIGHT, SOURCE_WIDTH } from './autoLayout.ts'

const clusters = [
  { id: 'ai', label: 'AI', description: 'AI things', color: '#00e5ff' },
  { id: 'design', label: 'Design', description: 'Design things', color: '#ffe600' },
  { id: 'tools', label: 'Tools', description: 'Tools things', color: '#9b5cff' },
]

const nodes = [
  { id: 'b', title: 'B item', kind: 'note', summary: 'B', cluster: 'ai', categories: ['ai'], tags: [], size: 'medium' },
  { id: 'a', title: 'A item', kind: 'note', summary: 'A', cluster: 'ai', categories: ['ai'], tags: [], size: 'large' },
  { id: 'bridge', title: 'Bridge item', kind: 'link', summary: 'Bridge', cluster: 'design', categories: ['design', 'tools'], tags: [], size: 'small' },
  { id: 'tool', title: 'Tool item', kind: 'tool', summary: 'Tool', cluster: 'tools', categories: ['tools'], tags: [], size: 'medium' },
]

const edges = [{ source: 'a', target: 'bridge', type: 'related' }]

function distanceFromCenter(point) {
  return Math.hypot(point.x - SOURCE_CENTER.x, point.y - SOURCE_CENTER.y)
}

function categoriesForNode(node) {
  return node.categories?.length ? node.categories : [node.cluster]
}

test('computeAutoLayout positions clusters and nodes without JSON coordinates', () => {
  const layout = computeAutoLayout({ clusters, nodes, edges })

  assert.equal(layout.clusters.length, clusters.length)
  assert.equal(layout.nodes.length, nodes.length)

  for (const cluster of layout.clusters) {
    assert.equal(typeof cluster.origin.x, 'number')
    assert.equal(typeof cluster.origin.y, 'number')
    assert.ok(cluster.origin.x > 120 && cluster.origin.x < SOURCE_WIDTH - 120)
    assert.ok(cluster.origin.y > 120 && cluster.origin.y < SOURCE_HEIGHT - 120)
  }

  for (const node of layout.nodes) {
    assert.equal(typeof node.position.x, 'number')
    assert.equal(typeof node.position.y, 'number')
    assert.ok(node.position.x > 80 && node.position.x < SOURCE_WIDTH - 80)
    assert.ok(node.position.y > 80 && node.position.y < SOURCE_HEIGHT - 80)
  }
})

test('computeAutoLayout is deterministic and separates sibling nodes', () => {
  const first = computeAutoLayout({ clusters, nodes, edges })
  const second = computeAutoLayout({ clusters, nodes, edges })

  assert.deepEqual(first, second)

  const a = first.nodes.find((node) => node.id === 'a')
  const b = first.nodes.find((node) => node.id === 'b')
  assert.ok(a)
  assert.ok(b)
  assert.ok(Math.hypot(a.position.x - b.position.x, a.position.y - b.position.y) > 110)
})

test('single-category items leave at least a 2x radial whitespace gap beyond their category hubs', () => {
  const layout = computeAutoLayout({ clusters, nodes, edges })
  const byCluster = new Map(layout.clusters.map((cluster) => [cluster.id, cluster]))

  for (const node of layout.nodes) {
    if (categoriesForNode(node).length !== 1) continue

    const cluster = byCluster.get(categoriesForNode(node)[0])
    assert.ok(cluster)

    const categoryRadius = distanceFromCenter(cluster.origin)
    const categoryToItem = Math.hypot(node.position.x - cluster.origin.x, node.position.y - cluster.origin.y)
    assert.ok(
      categoryToItem >= categoryRadius * 2,
      `${node.id} should sit at least twice as far beyond ${cluster.id} as ${cluster.id} sits from the brain`,
    )
  }
})

test('category hubs form a tight inner ring around the brain', () => {
  const layout = computeAutoLayout({ clusters, nodes, edges })

  for (const cluster of layout.clusters) {
    const radius = distanceFromCenter(cluster.origin)
    assert.ok(radius >= 150, `${cluster.id} should not overlap the brain`)
    assert.ok(radius <= 260, `${cluster.id} should stay close to the brain`)
  }
})

test('multi-category items sit outside the average direction of their category hubs', () => {
  const layout = computeAutoLayout({ clusters, nodes, edges })
  const byCluster = new Map(layout.clusters.map((cluster) => [cluster.id, cluster]))
  const bridge = layout.nodes.find((node) => node.id === 'bridge')
  assert.ok(bridge)

  const design = byCluster.get('design')
  const tools = byCluster.get('tools')
  assert.ok(design)
  assert.ok(tools)

  const midpoint = {
    x: (design.origin.x + tools.origin.x) / 2,
    y: (design.origin.y + tools.origin.y) / 2,
  }
  const toMidpoint = Math.hypot(bridge.position.x - midpoint.x, bridge.position.y - midpoint.y)
  const midpointRadius = distanceFromCenter(midpoint)
  const bridgeRadius = distanceFromCenter(bridge.position)

  assert.ok(toMidpoint >= midpointRadius * 2)
  assert.ok(bridgeRadius > midpointRadius * 2)
})

test('dense category items remain separated on the outer ring', () => {
  const denseNodes = Array.from({ length: 8 }, (_, index) => ({
    id: `ai-${index}`,
    title: `AI item ${index}`,
    kind: 'note',
    summary: 'Dense item',
    cluster: 'ai',
    categories: ['ai'],
    tags: [],
    size: 'medium',
  }))

  const layout = computeAutoLayout({ clusters, nodes: denseNodes, edges: [] })
  const ai = layout.clusters.find((cluster) => cluster.id === 'ai')
  assert.ok(ai)

  for (const node of layout.nodes) {
    const categoryRadius = distanceFromCenter(ai.origin)
    const categoryToItem = Math.hypot(node.position.x - ai.origin.x, node.position.y - ai.origin.y)
    assert.ok(categoryToItem >= categoryRadius * 2)
  }

  for (let leftIndex = 0; leftIndex < layout.nodes.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < layout.nodes.length; rightIndex += 1) {
      const left = layout.nodes[leftIndex]
      const right = layout.nodes[rightIndex]
      assert.ok(
        Math.hypot(left.position.x - right.position.x, left.position.y - right.position.y) > 70,
        `${left.id} and ${right.id} should not overlap`,
      )
    }
  }
})
