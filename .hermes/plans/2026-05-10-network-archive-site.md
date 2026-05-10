# Network Archive Website Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Build a local-first experimental website where Terry can arrange links, posts, news items, notes, and created work as floating spatial nodes clustered by theme, eventually deployable to Vercel.

**Architecture:** Start with a static Vite/React app backed by local JSON content files. The first version should prioritise taste, editing simplicity, and Vercel deployability over heavyweight CMS/database architecture. Nodes are rendered in a large pannable/zoomable canvas with SVG edges for visible relationships and clustered layout positions stored as data.

**Tech Stack:** Vite + React + TypeScript, CSS modules or plain CSS, SVG for graph edges, optional d3-force for layout experiments, local JSON/MD content files, Playwright later for visual smoke tests, Vercel static deployment.

---

## Design Direction

The reference image suggests:

- Black void background, monochrome palette, high-contrast white typography.
- Floating nodes distributed asymmetrically across a large canvas.
- Each node is part label, part marker, part content doorway.
- Small white squares act as anchors/thumbnails/hotspots.
- Some richer nodes can become wireframe/3D-ish preview containers.
- Grouping should be done through proximity, edges, shared labels, and subtle cluster halos — not cards in a grid.
- The page should feel like an exploratory map, not a blog index.

## Core Product Concept

A personal knowledge/creation constellation:

- **Nodes:** individual items: LinkedIn posts, articles, news links, notes, projects, essays, images, quotes.
- **Clusters:** themes such as AI, cybersecurity, design, Australia, weird internet, personal work, people, tools.
- **Edges:** explicit relationships between nodes, e.g. “inspired by”, “same theme”, “follow-up”, “counterpoint”.
- **Canvas:** spatial surface where clusters float and can be explored.
- **Detail view:** clicking a node opens a side panel or route with title, summary, tags, source link, date, and notes.

## Recommended Initial Scope

Version 1 should be deliberately small:

- One landing/map page.
- 12–20 sample nodes.
- 3–5 clusters.
- Clickable external links.
- Hover states and simple animated focus.
- Mobile fallback as a vertical clustered list.
- Static JSON content so deployment is boring.

Do **not** start with auth, database, CMS, realtime editing, accounts, or a complex graph engine. That is architecture cosplay at this stage.

## Data Model

Create `src/data/nodes.json`:

```json
[
  {
    "id": "linkedin-post-ai-001",
    "title": "A LinkedIn post I liked",
    "kind": "linkedin",
    "url": "https://www.linkedin.com/...",
    "summary": "Short note on why this matters.",
    "cluster": "ai",
    "tags": ["AI", "strategy"],
    "date": "2026-05-10",
    "position": { "x": 420, "y": 180 },
    "size": "medium"
  }
]
```

Create `src/data/edges.json`:

```json
[
  {
    "source": "linkedin-post-ai-001",
    "target": "news-item-002",
    "type": "related"
  }
]
```

Create `src/data/clusters.json`:

```json
[
  {
    "id": "ai",
    "label": "AI / agents / automation",
    "description": "Things about machine intelligence and practical automation.",
    "origin": { "x": 400, "y": 220 }
  }
]
```

## Interaction Model

- Landing page opens on the full constellation.
- Mouse/touch:
  - drag canvas to pan
  - wheel/pinch to zoom if implemented cleanly
  - hover node to brighten text and reveal summary
  - click node to open details
- Keyboard:
  - tab between nodes
  - enter opens detail panel
  - escape closes panel
- Detail panel:
  - shows title, kind, date, notes, tags
  - has primary “open source” link
  - optionally shows linked/related nodes

## Implementation Tasks

### Task 1: Create a separate local site directory

**Objective:** Avoid mixing this experimental site into the existing Hermes Agent website until we decide it replaces it.

**Files:**
- Create: `sites/network-archive/`

**Steps:**
1. From repo root, create a new app with Vite React TypeScript.
2. Use npm scripts: `dev`, `build`, `preview`.
3. Verify `npm run dev` serves locally.
4. Commit as `chore: scaffold network archive site`.

### Task 2: Add static content schema

**Objective:** Make the site content-driven from JSON.

**Files:**
- Create: `sites/network-archive/src/data/nodes.json`
- Create: `sites/network-archive/src/data/edges.json`
- Create: `sites/network-archive/src/data/clusters.json`
- Create: `sites/network-archive/src/types.ts`

**Steps:**
1. Add TypeScript types for `NodeItem`, `EdgeItem`, and `ClusterItem`.
2. Add 12 placeholder nodes based on likely Terry content categories.
3. Add 3 clusters and a few edges.
4. Verify TypeScript build passes.
5. Commit as `feat: add network archive content model`.

### Task 3: Build the static spatial canvas

**Objective:** Render nodes at explicit positions on a large dark canvas.

**Files:**
- Create: `sites/network-archive/src/components/ConstellationCanvas.tsx`
- Create: `sites/network-archive/src/components/NodeMarker.tsx`
- Modify: `sites/network-archive/src/App.tsx`

**Steps:**
1. Render a full viewport black stage.
2. Render each node as a small square plus bold white caption.
3. Use absolute positioning from `position.x/y`.
4. Add responsive scale/fallback for small screens.
5. Commit as `feat: render floating content nodes`.

### Task 4: Add relationship edges and cluster atmosphere

**Objective:** Make thematic grouping visible without making the design childish.

**Files:**
- Create: `sites/network-archive/src/components/GraphEdges.tsx`
- Modify: `sites/network-archive/src/components/ConstellationCanvas.tsx`

**Steps:**
1. Render SVG lines between related nodes.
2. Keep lines faint, monochrome, and low contrast.
3. Add cluster labels as subtle typographic anchors.
4. Optionally add faint radial glow or outline around dense clusters.
5. Commit as `feat: add graph edges and clusters`.

### Task 5: Add node detail panel

**Objective:** Let the page work as a real archive, not just an image.

**Files:**
- Create: `sites/network-archive/src/components/DetailPanel.tsx`
- Modify: `sites/network-archive/src/App.tsx`

**Steps:**
1. Clicking a node opens a side panel.
2. Panel displays title, kind, summary, tags, date, and source link.
3. Escape closes the panel.
4. Preserve accessibility with buttons/links, not div-click soup.
5. Commit as `feat: add node detail panel`.

### Task 6: Add pan/zoom carefully

**Objective:** Make the map feel spatial without introducing janky interaction.

**Files:**
- Modify: `sites/network-archive/src/components/ConstellationCanvas.tsx`
- Optional create: `sites/network-archive/src/hooks/usePanZoom.ts`

**Steps:**
1. Add drag-to-pan.
2. Add wheel zoom with min/max bounds.
3. Add “reset view” control.
4. Verify no scroll trap on mobile.
5. Commit as `feat: add spatial navigation`.

### Task 7: Add mobile fallback

**Objective:** Ensure the site is usable on phones, even if the desktop version is the art piece.

**Files:**
- Create: `sites/network-archive/src/components/MobileClusterList.tsx`
- Modify: CSS files

**Steps:**
1. Below a chosen breakpoint, show nodes grouped by cluster as a strong typographic list.
2. Keep the black/white design language.
3. Preserve links and detail panels.
4. Commit as `feat: add mobile clustered archive view`.

### Task 8: Local verification

**Objective:** Make sure the local version is solid before Vercel.

**Commands:**
- `npm run build`
- `npm run preview`

**Checks:**
- Page loads locally.
- Nodes render correctly.
- External links open.
- Detail panel works.
- Mobile fallback works.
- No console errors.

### Task 9: Vercel preparation, later

**Objective:** Prepare for deployment only after version 1 feels good locally.

**Files:**
- Possibly create: `sites/network-archive/vercel.json`
- Possibly update root/project settings if this becomes the replacement site.

**Steps:**
1. Decide whether this replaces the existing `website/` directory or deploys as a new Vercel project.
2. If replacing `002.au`, merge into `main` only after preview approval.
3. Keep Vercel preview branch workflow intact.
4. Confirm production/custom domain status after deployment.

## Tech Decision Notes

### Best initial choice: Vite + React + TypeScript

Reasons:
- Fast local dev.
- Easy Vercel static deployment.
- Good component boundaries for canvas, nodes, detail panel.
- JSON imports are straightforward.
- Low operational burden.

### Graph/rendering options

Start simple:
- CSS absolute positioning for nodes.
- SVG overlay for edges.

Add only if needed:
- `d3-force` for automatic clustering/layout experiments.
- `react-zoom-pan-pinch` if custom pan/zoom gets annoying.
- Canvas/WebGL only if performance becomes a real issue.

Do **not** begin with Three.js unless the first prototype proves the 3D/wireframe elements are essential. It will make content interaction and responsive design harder for no immediate payoff.

## Open Decisions for Terry

1. Should this be a personal homepage, a public archive, or an art/portfolio piece first?
2. Should each item open in-site details first, or immediately link out?
3. Do you want manual placement of nodes, or automatic clustering?
4. What are the first 12–20 real nodes we should seed it with?
5. Should the tone be austere/monochrome like the reference, or should 002.au have a subtle branded accent?

## Recommended Start

Start with a local prototype in `sites/network-archive/` using Vite + React + TypeScript, seeded with placeholder content and manual node positions. Build the visual language first. Once the map feels good, replace placeholders with Terry's real links and notes, then deploy to Vercel preview.
