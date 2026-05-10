import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react'

interface Point {
  x: number
  y: number
}

const PANEL_MARGIN = 12
const DEFAULT_PANEL_WIDTH = 360
const DEFAULT_PANEL_HEIGHT = 420

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function clampPoint(point: Point, element?: HTMLElement | null): Point {
  if (typeof window === 'undefined') {
    return point
  }

  const width = element?.offsetWidth || DEFAULT_PANEL_WIDTH
  const height = element?.offsetHeight || DEFAULT_PANEL_HEIGHT
  return {
    x: clamp(point.x, PANEL_MARGIN, Math.max(PANEL_MARGIN, window.innerWidth - width - PANEL_MARGIN)),
    y: clamp(point.y, PANEL_MARGIN, Math.max(PANEL_MARGIN, window.innerHeight - height - PANEL_MARGIN)),
  }
}

function defaultPosition(element?: HTMLElement | null): Point {
  if (typeof window === 'undefined') {
    return { x: PANEL_MARGIN, y: PANEL_MARGIN }
  }

  const width = element?.offsetWidth || DEFAULT_PANEL_WIDTH
  return clampPoint({ x: window.innerWidth - width - 24, y: 132 }, element)
}

export function useDraggablePanel<T extends HTMLElement>(): {
  panelRef: RefObject<T | null>
  style: { transform: string }
  isDragging: boolean
  onHandlePointerDown: (event: ReactPointerEvent<HTMLElement>) => void
} {
  const panelRef = useRef<T | null>(null)
  const [position, setPosition] = useState<Point | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; startPosition: Point } | null>(null)

  useLayoutEffect(() => {
    setPosition((current) => current ?? defaultPosition(panelRef.current))
  }, [])

  useEffect(() => {
    const onResize = () => {
      setPosition((current) => clampPoint(current ?? defaultPosition(panelRef.current), panelRef.current))
    }

    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const onHandlePointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) {
      return
    }

    const current = clampPoint(position ?? defaultPosition(panelRef.current), panelRef.current)
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startPosition: current,
    }
    setPosition(current)
    setIsDragging(true)
  }, [position])

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== event.pointerId) {
        return
      }

      setPosition(clampPoint({
        x: drag.startPosition.x + event.clientX - drag.startX,
        y: drag.startPosition.y + event.clientY - drag.startY,
      }, panelRef.current))
    }

    const stopDragging = (event: PointerEvent) => {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== event.pointerId) {
        return
      }

      dragRef.current = null
      setIsDragging(false)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', stopDragging)
    window.addEventListener('pointercancel', stopDragging)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', stopDragging)
      window.removeEventListener('pointercancel', stopDragging)
    }
  }, [])

  const currentPosition = position ?? { x: -9999, y: -9999 }

  return {
    panelRef,
    style: { transform: `translate3d(${currentPosition.x}px, ${currentPosition.y}px, 0)` },
    isDragging,
    onHandlePointerDown,
  }
}
