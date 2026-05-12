# Radial Category/Item Constellation Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Adjust the reidy.au constellation so the brain sits at the centre, category nodes form a closer/tighter inner ring, and item nodes sit further outward with category-link strings arcing back inward.

**Architecture:** Keep the existing deterministic source-space layout pipeline in `src/layout/autoLayout.ts`, but change it from “category hubs plus nearby item clouds” into a two-ring radial layout. Categories get a smaller inner radius around `SOURCE_CENTER`; item nodes get an outer anchor derived from their category direction, with tangential spreading and collision relaxation that preserves the outward relationship. SVG edge drawing in `GraphEdges.tsx` gets a stronger inward arc for item→category paths, with CSS tuned so the hierarchy reads visually.

**Tech Stack:** React 19, TypeScript, Vite, node:test with `--experimental-strip-types`, SVG quadratic Bézier paths, CSS.

---

## Current Behaviour

Relevant files:

- `sites/network-archive/src/layout/autoLayout.ts`
  - `CLUSTER_RADIUS_X = 430`, `CLUSTER_RADIUS_Y = 385` puts category hubs relatively far from the brain.
  - `initialNodePosition()` places single-category items near `rawAnchor` plus `bridgePull = 220`, but the relaxation anchor remains close to the category origin. The result is item clouds near/around the category rather than clearly beyond it.
  - Multi-category items currently sit near the midpoint between linked categories.
- `sites/network-archive/src/components/GraphEdges.tsx`
  - brain→category edges use `curvedPath(brain, cluster, 0.08)`.
  - category→item edges use `curvedPath(cluster, node, 0.13)`, a modest generic curve.
- `sites/network-archive/src/components/ConstellationCanvas.tsx`
  - `projectPoint()` scales source coordinates into viewport coordinates and computes depth from source-space centre distance.
- `sites/network-archive/src/App.css`
  - category labels are wide cards (`220px`), so a tighter inner ring risks overlap unless the ring radius and CSS widths are adjusted together.

Design implication: most of the requested change belongs in `autoLayout.ts`; edge shape and CSS should follow rather than drive the layout.

---

## Acceptance Criteria

- Category nodes are closer to the brain than item nodes in source-space radius.
- Category nodes do not overlap the brain and mostly avoid one another at desktop size.
- Single-category items sit beyond their category along the category’s outward radial direction.
- Multi-category items still make sense: they should sit outside the average direction of their linked categories, not collapse into the inner ring.
- Category→item strings visibly arc back inward to the relevant category node.
- Existing rotation and depth behaviour still works.
- Mobile list/detail behaviour is unchanged.
- `npm test`, `npm run lint`, and `npm run build` pass in `sites/network-archive`.

---

## Proposed Visual Geometry

Use source-space coordinates as the canonical layout:

- Brain: `SOURCE_CENTER` unchanged.
- Category ring:
  - `CATEGORY_RADIUS_X ≈ 300`
  - `CATEGORY_RADIUS_Y ≈ 265`
  - This is meaningfully tighter than the current `430 × 385`, but still large enough for label cards.
- Item ring:
  - Near/outer item target starts at the category origin plus `OUTER_ITEM_RADIAL_GAP ≈ 360–430` along the outward vector.
  - Tangential spread is per sibling group, roughly `150–190px` per sibling, but capped or curved so large categories do not form a straight ugly ladder.
- Clamp margins:
  - Keep existing `MIN_X`, `MAX_X`, `MIN_Y`, `MAX_Y`, but use a slightly larger internal margin for labels (`120–150`) if the outer ring pushes too close to edges.

My taste note: do not overdo the inner ring. If categories are too tight, the site will look like a messy dashboard rather than a constellation. The better target is “brain has short confident spokes to category cards; items clearly orbit outside those cards.”

---

## Task 1: Add radial distance tests for the new hierarchy

**Objective:** Lock in the core visual invariant before changing layout constants.

**Files:**

- Modify: `sites/network-archive/src/layout/autoLayout.test.mjs`

**Step 1: Add helper functions near the top of the test file**

```js
function distanceFromCenter(point) {
  return Math.hypot(point.x - SOURCE_CENTER.x, point.y - SOURCE_CENTER.y)
}

function categoriesForNode(node) {
  return node.categories?.length ? node.categories : [node.cluster]
}
```

**Step 2: Add test: category ring sits closer than single-category items**

Append:

```js
test('single-category items sit beyond their category hubs', () => {
  const layout = computeAutoLayout({ clusters, nodes, edges })
  const byCluster = new Map(layout.clusters.map((cluster) => [cluster.id, cluster]))

  for (const node of layout.nodes) {
    if (categoriesForNode(node).length !== 1) continue

    const cluster = byCluster.get(categoriesForNode(node)[0])
    assert.ok(cluster)

    assert.ok(
      distanceFromCenter(node.position) > distanceFromCenter(cluster.origin) + 80,
      `${node.id} should sit outside ${cluster.id}`,
    )
  }
})
```

**Step 3: Add test: category hubs remain clear of the brain**

```js
test('category hubs form a readable inner ring around the brain', () => {
  const layout = computeAutoLayout({ clusters, nodes, edges })

  for (const cluster of layout.clusters) {
    const radius = distanceFromCenter(cluster.origin)
    assert.ok(radius >= 220, `${cluster.id} should not overlap the brain`)
    assert.ok(radius <= 390, `${cluster.id} should stay in the inner ring`)
  }
})
```

**Step 4: Run the tests and verify failure**

Run:

```bash
cd sites/network-archive
npm test -- src/layout/autoLayout.test.mjs
```

Expected: the new “single-category items sit beyond” test may fail or be marginal with current anchors/relaxation. If it already passes for the toy data, continue; the next tests will tighten behaviour.

---

## Task 2: Rename and tighten the category-ring constants

**Objective:** Make the code reflect the new two-ring model and pull category hubs inward.

**Files:**

- Modify: `sites/network-archive/src/layout/autoLayout.ts`

**Step 1: Replace the cluster radius constants**

Change:

```ts
const CLUSTER_RADIUS_X = 430
const CLUSTER_RADIUS_Y = 385
```

To:

```ts
const CATEGORY_RING_RADIUS_X = 310
const CATEGORY_RING_RADIUS_Y = 275
const CATEGORY_SAFE_MARGIN_X = 170
const CATEGORY_SAFE_MARGIN_Y = 145
```

**Step 2: Update `createClusterLayout()` to use the new names**

Change the generated origin calculation to:

```ts
const generatedOrigin = {
  x: SOURCE_CENTER.x + Math.cos(angle) * CATEGORY_RING_RADIUS_X,
  y: SOURCE_CENTER.y + Math.sin(angle) * CATEGORY_RING_RADIUS_Y,
}
```

Change clamp margins to:

```ts
x: clamp(generatedOrigin.x, MIN_X + CATEGORY_SAFE_MARGIN_X, MAX_X - CATEGORY_SAFE_MARGIN_X),
y: clamp(generatedOrigin.y, MIN_Y + CATEGORY_SAFE_MARGIN_Y, MAX_Y - CATEGORY_SAFE_MARGIN_Y),
```

**Step 3: Run layout tests**

```bash
cd sites/network-archive
npm test -- src/layout/autoLayout.test.mjs
```

Expected: existing tests pass. New category-ring test should pass.

---

## Task 3: Introduce explicit inner/outer radial helpers

**Objective:** Remove implicit ad-hoc positioning and make item placement deliberately “outside the category”.

**Files:**

- Modify: `sites/network-archive/src/layout/autoLayout.ts`

**Step 1: Add constants below the category constants**

```ts
const ITEM_OUTER_GAP = 390
const MULTI_CATEGORY_OUTER_GAP = 300
const SIBLING_TANGENT_GAP = 165
const SIBLING_RADIAL_STAGGER = 34
const ITEM_ANCHOR_PULL = 0.014
```

**Step 2: Add helper after `normalizeVector()`**

```ts
function pointFromCenter(direction: Point, distance: number, origin = SOURCE_CENTER): Point {
  return {
    x: origin.x + direction.x * distance,
    y: origin.y + direction.y * distance,
  }
}
```

Optional: if this feels too abstract during implementation, inline it. Do not add a geometry library.

---

## Task 4: Rework `initialNodePosition()` for outer-ring item placement

**Objective:** Position each item beyond its category/category-average and spread siblings tangentially without destroying the radial hierarchy.

**Files:**

- Modify: `sites/network-archive/src/layout/autoLayout.ts:118-149`

**Step 1: Replace the bridge-pull/anchor block**

Replace this block:

```ts
const bridgePull = linkedClusters.length > 1 ? 0 : 220
const anchor = linkedClusters.length > 1
  ? {
      x: rawAnchor.x + outward.x * 160,
      y: rawAnchor.y + outward.y * 160,
    }
  : rawAnchor

return {
  anchor,
  position: {
    x: anchor.x + outward.x * (bridgePull + jitter) + tangent.x * siblingOffset * 170,
    y: anchor.y + outward.y * (bridgePull + jitter) + tangent.y * siblingOffset * 170,
  },
}
```

With:

```ts
const radialGap = linkedClusters.length > 1 ? MULTI_CATEGORY_OUTER_GAP : ITEM_OUTER_GAP
const radialStagger = (Math.abs(siblingOffset) % 3) * SIBLING_RADIAL_STAGGER
const tangentSpread = siblingOffset * SIBLING_TANGENT_GAP
const anchor = {
  x: rawAnchor.x + outward.x * radialGap,
  y: rawAnchor.y + outward.y * radialGap,
}

return {
  anchor,
  position: {
    x: anchor.x + outward.x * (jitter + radialStagger) + tangent.x * tangentSpread,
    y: anchor.y + outward.y * (jitter + radialStagger) + tangent.y * tangentSpread,
  },
}
```

**Step 2: Consider fallback for multi-category midpoint near centre**

If multi-category averages can land too close to the brain, `normalizeVector()` already uses `fallbackAngle`, but the `rawAnchor` remains central. Add this guard before `const outward` if test data reveals central collapse:

```ts
const centeredAnchor = Math.hypot(rawAnchor.x - SOURCE_CENTER.x, rawAnchor.y - SOURCE_CENTER.y) < 90
  ? pointFromCenter(normalizeVector({ x: rawAnchor.x - SOURCE_CENTER.x, y: rawAnchor.y - SOURCE_CENTER.y }, fallbackAngle), 180)
  : rawAnchor
```

Then use `centeredAnchor` where `rawAnchor` currently feeds `outward`, `anchor`, and sibling calculations. Keep this only if needed; simpler is better.

**Step 3: Run tests**

```bash
cd sites/network-archive
npm test -- src/layout/autoLayout.test.mjs
```

Expected: radial hierarchy tests pass; the existing multi-category test may fail because the intended behaviour changes from “between hubs” to “outside the average of hubs”. That is handled in Task 5.

---

## Task 5: Update multi-category behaviour tests

**Objective:** Reflect the new visual rule for bridge items: they remain associated with multiple categories, but sit outside the inner category ring.

**Files:**

- Modify: `sites/network-archive/src/layout/autoLayout.test.mjs:55-75`

**Step 1: Replace the old multi-category test name and assertions**

Replace:

```js
test('multi-category items sit between their category hubs', () => {
```

With:

```js
test('multi-category items sit outside the average direction of their category hubs', () => {
```

Replace the final assertions:

```js
assert.ok(toMidpoint < 260)
assert.ok(toCenter > 120)
```

With:

```js
const midpointRadius = distanceFromCenter(midpoint)
const bridgeRadius = distanceFromCenter(bridge.position)

assert.ok(toMidpoint < 420)
assert.ok(bridgeRadius > midpointRadius + 80)
```

**Step 2: Run tests**

```bash
cd sites/network-archive
npm test -- src/layout/autoLayout.test.mjs
```

Expected: all layout tests pass.

---

## Task 6: Tune relaxation so items do not get pulled back into the inner ring

**Objective:** Preserve collision avoidance without allowing edge springs or anchor pull to collapse the outer ring.

**Files:**

- Modify: `sites/network-archive/src/layout/autoLayout.ts:151-208`

**Step 1: Use the new anchor pull constant**

Change:

```ts
simNode.velocity.x += (simNode.anchor.x - simNode.position.x) * 0.006 * simNode.weight
simNode.velocity.y += (simNode.anchor.y - simNode.position.y) * 0.006 * simNode.weight
```

To:

```ts
simNode.velocity.x += (simNode.anchor.x - simNode.position.x) * ITEM_ANCHOR_PULL * simNode.weight
simNode.velocity.y += (simNode.anchor.y - simNode.position.y) * ITEM_ANCHOR_PULL * simNode.weight
```

**Step 2: Reduce peer-edge spring pull if needed**

Current item-to-item edge spring can pull items across the diagram:

```ts
const wanted = 230
const force = ((distance - wanted) / distance) * 0.003
```

Try first:

```ts
const wanted = 280
const force = ((distance - wanted) / distance) * 0.0018
```

This keeps peer links suggestive without overriding category radial structure.

**Step 3: Run tests**

```bash
cd sites/network-archive
npm test -- src/layout/autoLayout.test.mjs
```

Expected: pass.

---

## Task 7: Add/adjust tests for dense sibling spread

**Objective:** Avoid a regression where many items in one category overlap or get clamped into the same corner.

**Files:**

- Modify: `sites/network-archive/src/layout/autoLayout.test.mjs`

**Step 1: Add a dense fixture inside a new test**

```js
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
    assert.ok(distanceFromCenter(node.position) > distanceFromCenter(ai.origin) + 60)
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
```

**Step 2: Run tests**

```bash
cd sites/network-archive
npm test -- src/layout/autoLayout.test.mjs
```

Expected: pass. If it fails by a small distance, tune `SIBLING_TANGENT_GAP`, `nodeRadius()`, or relaxation iterations rather than hard-coding special cases.

---

## Task 8: Strengthen item→category edge arcs

**Objective:** Make link strings visibly arc inward from outer items back to inner category hubs.

**Files:**

- Modify: `sites/network-archive/src/components/GraphEdges.tsx`

**Step 1: Add an inward arc helper below `curvedPath()`**

```ts
function inwardCategoryPath(cluster: GraphPoint, node: GraphPoint, bend = 0.24) {
  const midX = (cluster.position.x + node.position.x) / 2
  const midY = (cluster.position.y + node.position.y) / 2
  const dx = node.position.x - cluster.position.x
  const dy = node.position.y - cluster.position.y
  const distance = Math.max(1, Math.hypot(dx, dy))
  const normalSign = node.id < cluster.id ? -1 : 1
  const normalX = (-dy / distance) * distance * bend * normalSign
  const normalY = (dx / distance) * distance * bend * normalSign

  return `M ${node.position.x} ${node.position.y} Q ${midX + normalX} ${midY + normalY} ${cluster.position.x} ${cluster.position.y}`
}
```

Rationale: start the path at the item and terminate at the category so the visual reads as “outer string arcs back inward”. The `normalSign` gives deterministic alternating arcs and avoids all curves bowing the same way.

**Step 2: Use it for category-item edges**

Change:

```tsx
d={curvedPath(cluster, node, 0.13)}
```

To:

```tsx
d={inwardCategoryPath(cluster, node, 0.22)}
```

**Step 3: Run type/build checks**

```bash
cd sites/network-archive
npm run build
```

Expected: pass.

---

## Task 9: Adjust CSS for tighter category cards and subtler inner spokes

**Objective:** Prevent inner-ring category labels from visually colliding and make hierarchy readable.

**Files:**

- Modify: `sites/network-archive/src/App.css`

**Step 1: Narrow the category card slightly**

Change:

```css
.category-node {
  width: 220px;
```

To:

```css
.category-node {
  width: clamp(172px, 14vw, 204px);
```

**Step 2: Slightly reduce category description prominence**

Change:

```css
.category-node small {
  margin-top: 7px;
  font-size: 0.72rem;
  line-height: 1.28;
}
```

To:

```css
.category-node small {
  margin-top: 6px;
  font-size: 0.68rem;
  line-height: 1.24;
}
```

**Step 3: Emphasize item-category strings over peer strings, but not too much**

Change:

```css
.edge-item-category {
  stroke-width: 1.1;
}
```

To:

```css
.edge-item-category {
  stroke-width: 1.2;
  stroke-linecap: round;
}
```

Optionally reduce brain spokes if the centre becomes too busy:

```css
.edge-brain-category {
  stroke-width: 1.45;
}
```

**Step 4: Build check**

```bash
cd sites/network-archive
npm run build
```

Expected: pass.

---

## Task 10: Visual QA locally on desktop and mobile widths

**Objective:** Verify this is actually prettier, not just mathematically correct.

**Files:**

- No code changes unless QA reveals issues.

**Step 1: Start Vite locally**

```bash
cd sites/network-archive
npm run dev -- --host 127.0.0.1
```

**Step 2: Open the local site**

Use browser tooling against the printed Vite URL, usually:

```text
http://127.0.0.1:5173/
```

**Step 3: Desktop checks**

- Brain remains visually central.
- Categories form a clear inner ring.
- Category cards do not overlap the brain.
- Item labels appear mostly outside category cards.
- Category→item lines arc inward and do not create a dense unreadable knot.
- Hovering/clicking an item still highlights/opens detail.
- Drag rotation still works.

**Step 4: Narrow/mobile checks**

Use browser viewport or responsive mode around:

- `1120px` wide
- `760px` wide
- phone-ish width around `390px`

Expected: the canvas remains usable enough, and the existing `.mobile-clusters` list still appears below the reduced-height canvas on small screens.

---

## Task 11: Full verification before commit/deploy

**Objective:** Run the normal quality gates for this Vite app.

**Files:**

- No code changes unless checks fail.

**Commands:**

```bash
cd sites/network-archive
npm test
npm run lint
npm run build
```

Expected:

- tests pass
- lint passes
- build emits `dist/` successfully

---

## Task 12: Commit on a preview branch, not production

**Objective:** Keep Terry’s production/main separation intact.

**Files:**

- Commit only relevant source/test/CSS/plan files.

**Step 1: Check branch and diff**

```bash
git status --short
git branch --show-current
git diff -- sites/network-archive/src/layout/autoLayout.ts \
  sites/network-archive/src/layout/autoLayout.test.mjs \
  sites/network-archive/src/components/GraphEdges.tsx \
  sites/network-archive/src/App.css \
  sites/network-archive/docs/plans/2026-05-12-radial-category-item-constellation.md
```

**Step 2: Commit**

```bash
git add sites/network-archive/src/layout/autoLayout.ts \
  sites/network-archive/src/layout/autoLayout.test.mjs \
  sites/network-archive/src/components/GraphEdges.tsx \
  sites/network-archive/src/App.css \
  sites/network-archive/docs/plans/2026-05-12-radial-category-item-constellation.md

git commit -m "feat(network-archive): separate category and item constellation rings"
```

**Step 3: Deploy path**

Use preview first, not direct production, unless Terry explicitly asks to ship it:

- Preferred branch: `preview/bold-new-things` or a new feature branch.
- Confirm Vercel URL as **preview** and whether auth is required.
- Only merge/promote to production after visual approval.

---

## Risks / Tuning Notes

- **Too-tight category ring:** if category cards overlap, increase `CATEGORY_RING_RADIUS_X/Y` by ~20–40 or reduce card width further. Do not make category descriptions multiline essays.
- **Outer items clipped at viewport edges:** lower `ITEM_OUTER_GAP` by ~30 or increase source-space margins. Check desktop and mobile projections before deciding.
- **Dense category looks like a wall:** reduce `SIBLING_TANGENT_GAP` slightly and add radial staggering, rather than letting items overlap.
- **Multi-category items become confusing:** if they feel unmoored, render their item→category edges slightly brighter on hover only, not always.
- **Arcs become spaghetti:** keep peer edges faint; the hierarchy should be brain→category→item, not all graph relationships screaming at once.

---

## Implementation Summary

The core change is a deterministic two-ring radial layout:

1. Pull category hubs inward by replacing `CLUSTER_RADIUS_*` with `CATEGORY_RING_RADIUS_*`.
2. Anchor every item outside its category/category-average with explicit radial gaps.
3. Keep collision relaxation, but bias it harder toward outer anchors and weaken peer-edge spring pull.
4. Draw item-category SVG paths from item back to category with stronger deterministic arcs.
5. Tighten category card CSS so the inner ring is readable.
6. Verify with unit tests, lint/build, and local visual QA before preview deployment.
