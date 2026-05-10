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

test('multi-category items sit between their category hubs', () => {
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
  const toCenter = Math.hypot(bridge.position.x - SOURCE_CENTER.x, bridge.position.y - SOURCE_CENTER.y)

  assert.ok(toMidpoint < 260)
  assert.ok(toCenter > 120)
})
