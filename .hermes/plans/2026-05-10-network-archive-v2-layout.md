# Network Archive V2 Layout Update Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Update the existing local network archive prototype so the constellation canvas owns the full viewport, with a slim full-width top banner, draggable map navigation, and a floating movable detail panel that appears only after a node is selected.

**Architecture:** Keep the current Vite + React + TypeScript app. Refactor layout state into small hooks/components: one hook for draggable canvas pan, one hook for movable floating panel position. Preserve JSON-driven nodes/edges/clusters and existing visual language. Do not add a graph library yet; manual positions remain the correct design choice.

**Tech Stack:** Existing Vite/React/TypeScript app under `sites/network-archive/`, CSS, SVG edges, Pointer Events for drag interactions.

---

## Current Baseline

Existing prototype branch: `feat/network-archive-prototype`

Current files of interest:

- `sites/network-archive/src/App.tsx`
- `sites/network-archive/src/App.css`
- `sites/network-archive/src/components/ConstellationCanvas.tsx`
- `sites/network-archive/src/components/DetailPanel.tsx`
- `sites/network-archive/src/components/MobileClusterList.tsx`
- `sites/network-archive/src/components/NodeMarker.tsx`
- `sites/network-archive/src/components/GraphEdges.tsx`
- `sites/network-archive/src/data/*.json`

## Desired UX Changes

1. The constellation/map area should take up the whole screen beneath/behind the app chrome.
2. The canvas should be draggable/pannable so users can move around the nodes.
3. Header, title, intro, and tag/category squares should become a compact top banner spanning the full page width.
4. The detail box should no longer reserve a right-side column.
5. The detail box should float above the canvas.
6. The detail box should be draggable/movable.
7. The detail box should appear only after the user clicks a node.
8. Escape and close button should hide the detail box.

## Design Decisions

### Canvas behaviour

- Use Pointer Events, not mouse-only events.
- Dragging empty canvas pans the map.
- Node clicks should not start a pan.
- Cursor changes:
  - canvas: `grab`
  - canvas while dragging: `grabbing`
  - nodes: `pointer`
- Start with pan only. Add zoom later if needed. Pan is the meaningful interaction Terry explicitly requested.

### Top banner

- Fixed or sticky at top.
- Full width.
- Compact, translucent black, subtle border bottom.
- Contains:
  - small eyebrow: `Ok so I guess this is`
  - large-ish but compressed `002.au`
  - one-line intro
  - cluster chips/counts
- The canvas should begin under the banner visually, but it can continue behind with padding/top safe area.

### Floating detail panel

- Render only when `selectedNode` exists.
- Position absolute/fixed over the canvas.
- Default initial position: right side below banner, e.g. `{ x: window.innerWidth - 390, y: 130 }` with bounds.
- Draggable by a panel header/handle, not by all content, so users can still select/click links inside.
- Keep the external link clickable.
- When selecting a new node, update content but keep current panel position unless the panel was never opened.

### Mobile behaviour

- On small screens, keep banner compact.
- Canvas can still pan, but also retain/mobile fallback list below or as overlay panel if needed.
- For first update, keep existing mobile list but adapt it below the full-screen canvas or behind a simple section. Do not overbuild.

## Implementation Tasks

### Task 1: Refactor top-level layout into banner + canvas layers

**Objective:** Remove the fixed two-column workspace and make the app a full-viewport experience.

**Files:**
- Modify: `sites/network-archive/src/App.tsx`
- Modify: `sites/network-archive/src/App.css`

**Steps:**
1. Replace `.site-header` with a new `.top-banner` structure.
2. Move existing eyebrow, `002.au`, intro, and cluster chips inside the banner.
3. Replace `.workspace` grid with `.map-viewport` containing `ConstellationCanvas` and conditional `DetailPanel`.
4. Remove the always-visible empty detail panel.
5. Keep `selectedNode` initial state as `undefined` instead of `nodes[0]`.
6. Run `npm run build`.
7. Commit: `refactor: move archive chrome into top banner`.

**Acceptance checks:**
- Page opens with no detail panel visible.
- Banner spans full width.
- Canvas fills available viewport below/behind banner.
- Clicking a node still selects it.

### Task 2: Add draggable canvas pan hook

**Objective:** Let users drag the constellation around the viewport.

**Files:**
- Create: `sites/network-archive/src/hooks/useCanvasPan.ts`
- Modify: `sites/network-archive/src/components/ConstellationCanvas.tsx`
- Modify: `sites/network-archive/src/App.css`

**Implementation outline:**

```ts
interface Point { x: number; y: number }

export function useCanvasPan(initial = { x: 0, y: 0 }) {
  // state: offset, isDragging
  // onPointerDown: capture pointer, store start cursor and start offset
  // onPointerMove: if dragging, update offset
  // onPointerUp/onPointerCancel: release capture, stop dragging
  // return { offset, isDragging, panHandlers, resetPan }
}
```

**Steps:**
1. Create the hook with Pointer Events support.
2. Attach pan handlers to the canvas shell/background.
3. Apply transform to `.constellation-stage`: existing center/scale transform plus dynamic `translate(offset.x, offset.y)`.
4. Stop propagation on node buttons so node click does not drag the canvas.
5. Add optional reset button in banner or top-left map controls.
6. Run `npm run build` and `npm run lint`.
7. Commit: `feat: add draggable constellation canvas`.

**Acceptance checks:**
- Dragging empty canvas moves all nodes and edges together.
- Clicking a node opens details without accidental panning.
- Edges remain aligned with nodes.
- No console errors.

### Task 3: Convert detail panel into floating overlay

**Objective:** Show detail only after selection, floating over the canvas rather than occupying layout space.

**Files:**
- Modify: `sites/network-archive/src/components/DetailPanel.tsx`
- Modify: `sites/network-archive/src/App.tsx`
- Modify: `sites/network-archive/src/App.css`

**Steps:**
1. Remove empty detail panel rendering.
2. Render `DetailPanel` only when `selectedNode` exists.
3. Change panel CSS from sticky sidebar to `.floating-detail-panel` fixed/absolute overlay.
4. Add a visual drag handle/header area.
5. Ensure close button and Escape both hide the panel.
6. Run `npm run build`.
7. Commit: `feat: float detail panel over map`.

**Acceptance checks:**
- Initial page has no detail panel.
- Click node → panel appears over canvas.
- Click close or press Escape → panel disappears.
- External source link still works.

### Task 4: Add movable detail panel hook

**Objective:** Let users drag the detail box around independently.

**Files:**
- Create: `sites/network-archive/src/hooks/useDraggablePanel.ts`
- Modify: `sites/network-archive/src/components/DetailPanel.tsx`
- Modify: `sites/network-archive/src/App.tsx`

**Implementation outline:**

```ts
export function useDraggablePanel(defaultPosition: Point) {
  // state: position, isDragging
  // drag only from handle props
  // clamp position to viewport bounds
  // return { position, isDragging, handleProps, setPosition }
}
```

**Steps:**
1. Create draggable panel hook using Pointer Events.
2. Attach drag handlers only to the panel handle/header.
3. Clamp panel to viewport so it cannot be lost offscreen.
4. Keep panel position when selecting another node.
5. Recalculate/clamp on window resize.
6. Run `npm run build` and `npm run lint`.
7. Commit: `feat: make detail panel movable`.

**Acceptance checks:**
- User can drag detail panel by the handle.
- Links inside panel remain clickable.
- Panel cannot disappear entirely offscreen.
- Selecting another node updates content without resetting position unnecessarily.

### Task 5: Polish full-screen visual composition

**Objective:** Make the new layout feel intentional, not like controls bolted onto the prototype.

**Files:**
- Modify: `sites/network-archive/src/App.css`
- Possibly modify: `sites/network-archive/src/data/nodes.json`
- Possibly modify: `sites/network-archive/src/data/clusters.json`

**Steps:**
1. Adjust canvas initial scale/position so useful nodes are visible on first load.
2. Increase canvas stage dimensions if needed.
3. Tune banner height, contrast, and z-index.
4. Tune node contrast/readability now that canvas occupies more space.
5. Ensure map controls and detail panel do not cover too much of the constellation.
6. Use browser visual check.
7. Commit: `style: polish full-screen archive layout`.

**Acceptance checks:**
- The site feels like a full-screen spatial object.
- Top banner is useful but not dominant.
- Canvas is the hero.
- Detail panel feels like a movable object floating on the map.

### Task 6: Verify local-network development server

**Objective:** Keep Terry able to view the prototype from another LAN host.

**Commands:**

```bash
cd sites/network-archive
npm run build
npm run lint
npm run dev -- --host 0.0.0.0 --port 5177
```

**Checks:**
- Local browser loads `http://127.0.0.1:5177/`.
- LAN browser loads `http://<machine-ip>:5177/`.
- Drag canvas works from LAN host.
- Click node opens panel.
- Drag panel works.
- Escape/close hides panel.

## Risks / Pitfalls

- Pointer event conflict between canvas dragging and node clicking. Fix by stopping propagation on node pointer down/click.
- Transform composition can break edge alignment. Apply pan transform only to one common parent containing nodes, edges, labels, and wireframes.
- Fixed banner can cover nodes. Add top safe padding or initial pan offset.
- Movable panel can get lost offscreen. Clamp position.
- Mobile pan can trap scroll. On small screens, use `touch-action: none` only on the canvas, not the whole page.

## Recommended Execution Order

Do this in order:

1. Banner + layout refactor.
2. Canvas pan.
3. Floating detail panel.
4. Movable detail panel.
5. Visual polish.
6. Build/lint/browser/LAN verification.

Do not add zoom until pan feels good. Zoom is a second-order interaction and easy to make annoying.
