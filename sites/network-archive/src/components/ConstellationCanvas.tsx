import type { CSSProperties } from 'react'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ClusterItem, EdgeItem, NodeItem } from '../types'
import { useConstellationRotation } from '../hooks/useConstellationRotation'
import { computeAutoLayout, SOURCE_CENTER, SOURCE_HEIGHT, SOURCE_WIDTH } from '../layout/autoLayout'
import { GraphEdges } from './GraphEdges'
import type { GraphPoint, ProjectedCluster } from './GraphEdges'
import { NodeMarker } from './NodeMarker'
import type { ProjectedNode } from './NodeMarker'

interface ConstellationCanvasProps {
  clusters: ClusterItem[]
  edges: EdgeItem[]
  nodes: NodeItem[]
  activeNodeId?: string
  isDetailOpen: boolean
  onSelectNode: (node: NodeItem) => void
  onHoverNode: (nodeId?: string) => void
}

interface Size {
  width: number
  height: number
}

const MIN_STAGE_WIDTH = 320
const MIN_STAGE_HEIGHT = 420

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [size, setSize] = useState<Size>({ width: MIN_STAGE_WIDTH, height: MIN_STAGE_HEIGHT })

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) {
      return undefined
    }

    const updateSize = () => {
      const rect = element.getBoundingClientRect()
      setSize({
        width: Math.max(MIN_STAGE_WIDTH, rect.width),
        height: Math.max(MIN_STAGE_HEIGHT, rect.height),
      })
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return { ref, size }
}

function rotateSourcePoint(sourcePosition: { x: number; y: number }, rotation: number) {
  const dx = sourcePosition.x - SOURCE_CENTER.x
  const dy = sourcePosition.y - SOURCE_CENTER.y
  const cos = Math.cos(rotation)
  const sin = Math.sin(rotation)

  return {
    x: SOURCE_CENTER.x + dx * cos - dy * sin,
    y: SOURCE_CENTER.y + dx * sin + dy * cos,
  }
}

function projectPoint(sourcePosition: { x: number; y: number }, rotation: number, size: Size) {
  const topPadding = clamp(size.height * 0.2, 132, 186)
  const bottomPadding = clamp(size.height * 0.08, 56, 120)
  const sidePadding = clamp(size.width * 0.08, 42, 132)
  const usableWidth = Math.max(280, size.width - sidePadding * 2)
  const usableHeight = Math.max(320, size.height - topPadding - bottomPadding)
  const rotated = rotateSourcePoint(sourcePosition, rotation)
  const xProgress = rotated.x / SOURCE_WIDTH
  const yProgress = rotated.y / SOURCE_HEIGHT
  const centreDistance = Math.hypot(sourcePosition.x - SOURCE_CENTER.x, sourcePosition.y - SOURCE_CENTER.y)
  const maxDistance = 690

  return {
    x: sidePadding + xProgress * usableWidth,
    y: topPadding + yProgress * usableHeight,
    depth: 1 - clamp(centreDistance / maxDistance, 0, 1) * 0.42,
  }
}

function visualFromDepth(depth: number) {
  return {
    visualScale: 0.86 + depth * 0.18,
    visualOpacity: 0.64 + depth * 0.36,
  }
}

function BrainIcon() {
  return (
    <svg className="brain-icon" viewBox="0 0 120 96" role="img" aria-label="Brain: personal hivemind centre">
      <path d="M46 15c-9 0-16 6-18 14-9 2-16 10-16 20 0 6 3 12 7 16-1 12 8 22 20 22 5 0 10-2 14-6V20c-2-3-4-5-7-5Z" />
      <path d="M74 15c9 0 16 6 18 14 9 2 16 10 16 20 0 6-3 12-7 16 1 12-8 22-20 22-5 0-10-2-14-6V20c2-3 4-5 7-5Z" />
      <path d="M53 27c-7 0-12 5-12 12m12 14c-9 0-16 6-17 15m31-41c7 0 12 5 12 12M67 53c9 0 16 6 17 15M60 18v67" />
    </svg>
  )
}

export function ConstellationCanvas({
  clusters,
  edges,
  nodes,
  activeNodeId,
  isDetailOpen,
  onSelectNode,
  onHoverNode,
}: ConstellationCanvasProps) {
  const { ref: shellRef, size } = useElementSize<HTMLElement>()
  const { rotation, isRotating, isAutoRotating, resetRotation, rotationHandlers } = useConstellationRotation({
    initialRotation: 0,
    autoRotatePaused: isDetailOpen,
  })

  const autoLayout = useMemo(() => computeAutoLayout({ clusters, nodes, edges }), [clusters, nodes, edges])

  const brain = useMemo<GraphPoint>(() => {
    const projection = projectPoint(SOURCE_CENTER, rotation, size)
    return {
      id: 'brain',
      position: { x: projection.x, y: projection.y },
      depth: 1,
    }
  }, [rotation, size])

  const projectedNodes = useMemo<ProjectedNode[]>(() => {
    return autoLayout.nodes
      .map((node) => {
        const projection = projectPoint(node.position, rotation, size)
        return {
          ...node,
          position: {
            x: projection.x,
            y: projection.y,
          },
          depth: projection.depth,
          ...visualFromDepth(projection.depth),
        }
      })
      .sort((a, b) => a.depth - b.depth)
  }, [autoLayout.nodes, rotation, size])

  const projectedClusters = useMemo<ProjectedCluster[]>(() => {
    return autoLayout.clusters.map((cluster) => {
      const projection = projectPoint(cluster.origin, rotation, size)
      return {
        ...cluster,
        position: {
          x: projection.x,
          y: projection.y,
        },
        depth: projection.depth,
        opacity: 0.82 + projection.depth * 0.18,
      }
    })
  }, [autoLayout.clusters, rotation, size])

  return (
    <section
      ref={shellRef}
      className={`constellation-shell ${isRotating ? 'is-rotating' : ''} ${isAutoRotating ? 'is-auto-rotating' : ''}`}
      data-auto-rotating={isAutoRotating ? 'true' : 'false'}
      aria-label="Spatial archive map"
      {...rotationHandlers}
    >
      <div className="map-instructions">
        <span>002.au / brain → categories → items</span>
        <span>drag empty space to rotate · click a node to inspect</span>
      </div>
      <button type="button" className="pan-reset" onClick={resetRotation} data-no-canvas-rotate="true">
        reset view
      </button>
      <div className="constellation-stage">
        <div className="coordinate-grid" aria-hidden="true" />
        <GraphEdges
          edges={edges}
          nodes={projectedNodes}
          clusters={projectedClusters}
          brain={brain}
          activeNodeId={activeNodeId}
          width={size.width}
          height={size.height}
        />
        <div
          className="brain-node"
          style={{ left: brain.position.x, top: brain.position.y, zIndex: 48 } as CSSProperties}
        >
          <BrainIcon />
          <span>hivemind</span>
        </div>
        {projectedClusters.map((cluster) => (
          <div
            key={cluster.id}
            className="category-node"
            style={{
              '--category-color': cluster.color,
              left: cluster.position.x,
              top: cluster.position.y,
              opacity: cluster.opacity,
              zIndex: Math.round(30 + cluster.depth * 12),
            } as CSSProperties}
          >
            <span>{cluster.label}</span>
            <small>{cluster.description}</small>
          </div>
        ))}
        {projectedNodes.map((node) => (
          <NodeMarker
            key={node.id}
            node={node}
            isActive={node.id === activeNodeId}
            onSelect={onSelectNode}
            onHover={onHoverNode}
          />
        ))}
      </div>
    </section>
  )
}
