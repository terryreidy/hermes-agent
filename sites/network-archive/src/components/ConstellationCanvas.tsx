import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ClusterItem, EdgeItem, NodeItem } from '../types'
import { useConstellationRotation } from '../hooks/useConstellationRotation'
import { GraphEdges } from './GraphEdges'
import { NodeMarker } from './NodeMarker'
import type { ProjectedNode } from './NodeMarker'

interface ConstellationCanvasProps {
  clusters: ClusterItem[]
  edges: EdgeItem[]
  nodes: NodeItem[]
  activeNodeId?: string
  onSelectNode: (node: NodeItem) => void
  onHoverNode: (nodeId?: string) => void
}

interface Size {
  width: number
  height: number
}

interface ProjectedCluster extends ClusterItem {
  position: {
    x: number
    y: number
  }
  depth: number
  opacity: number
  blur: number
}

const SOURCE_WIDTH = 1500
const SOURCE_HEIGHT = 1350
const SOURCE_CENTER_X = SOURCE_WIDTH / 2
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

function projectPoint(sourcePosition: { x: number; y: number }, rotation: number, size: Size) {
  const edgePadding = clamp(size.width * 0.17, 130, 260)
  const topPadding = clamp(size.height * 0.18, 112, 180)
  const bottomPadding = clamp(size.height * 0.08, 56, 120)
  const usableHeight = Math.max(360, size.height - topPadding - bottomPadding)
  const yProgress = sourcePosition.y / SOURCE_HEIGHT
  const sourceOffset = sourcePosition.x - SOURCE_CENTER_X
  const angle = (sourceOffset / SOURCE_CENTER_X) * Math.PI * 0.86 + rotation
  const depth = (Math.cos(angle) + 1) / 2
  const radius = Math.max(260, size.width / 2 - edgePadding)
  const perspective = 0.78 + depth * 0.2

  return {
    x: size.width / 2 + Math.sin(angle) * radius * perspective,
    y: topPadding + yProgress * usableHeight,
    depth,
  }
}

function visualFromDepth(depth: number) {
  return {
    visualScale: 0.78 + depth * 0.34,
    visualOpacity: 0.32 + depth * 0.68,
    visualBlur: Math.max(0, (1 - depth) * 2.2),
  }
}

export function ConstellationCanvas({
  clusters,
  edges,
  nodes,
  activeNodeId,
  onSelectNode,
  onHoverNode,
}: ConstellationCanvasProps) {
  const { ref: shellRef, size } = useElementSize<HTMLElement>()
  const { rotation, isRotating, resetRotation, rotationHandlers } = useConstellationRotation(-0.34)

  const projectedNodes = useMemo<ProjectedNode[]>(() => {
    return nodes
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
  }, [nodes, rotation, size])

  const projectedClusters = useMemo<ProjectedCluster[]>(() => {
    return clusters.map((cluster) => {
      const projection = projectPoint(cluster.origin, rotation, size)
      return {
        ...cluster,
        position: {
          x: projection.x,
          y: projection.y,
        },
        depth: projection.depth,
        opacity: 0.16 + projection.depth * 0.32,
        blur: Math.max(0, (1 - projection.depth) * 1.8),
      }
    })
  }, [clusters, rotation, size])

  return (
    <section
      ref={shellRef}
      className={`constellation-shell ${isRotating ? 'is-rotating' : ''}`}
      aria-label="Spatial archive map"
      {...rotationHandlers}
    >
      <div className="map-instructions">
        <span>002.au / rotating constellation</span>
        <span>drag empty space to rotate · click a node to inspect</span>
      </div>
      <button type="button" className="pan-reset" onClick={resetRotation} data-no-canvas-rotate="true">
        reset view
      </button>
      <div className="constellation-stage">
        <div className="coordinate-grid" aria-hidden="true" />
        {projectedClusters.map((cluster) => (
          <div
            key={cluster.id}
            className={`cluster-label cluster-${cluster.id}`}
            style={{
              left: cluster.position.x,
              top: cluster.position.y,
              opacity: cluster.opacity,
              filter: `blur(${cluster.blur}px)`,
              zIndex: Math.round(4 + cluster.depth * 8),
            }}
          >
            <span>{cluster.label}</span>
            <small>{cluster.description}</small>
          </div>
        ))}
        <GraphEdges edges={edges} nodes={projectedNodes} activeNodeId={activeNodeId} width={size.width} height={size.height} />
        {projectedNodes.map((node) => (
          <NodeMarker
            key={node.id}
            node={node}
            isActive={node.id === activeNodeId}
            onSelect={onSelectNode}
            onHover={onHoverNode}
          />
        ))}
        <div className="wireframe wireframe-one" aria-hidden="true">
          <span />
        </div>
        <div className="wireframe wireframe-two" aria-hidden="true">
          <span />
        </div>
      </div>
    </section>
  )
}
