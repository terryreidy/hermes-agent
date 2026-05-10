import { useCallback, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

interface Point {
  x: number
  y: number
}

const ZERO: Point = { x: 0, y: 0 }

export function useCanvasPan() {
  const [pan, setPan] = useState<Point>(ZERO)
  const [isPanning, setIsPanning] = useState(false)
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; startPan: Point } | null>(null)

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) {
      return
    }

    const target = event.target as HTMLElement
    if (target.closest('button, a, [data-no-canvas-pan="true"]')) {
      return
    }

    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startPan: pan,
    }
    setIsPanning(true)
  }, [pan])

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) {
      return
    }

    setPan({
      x: drag.startPan.x + event.clientX - drag.startX,
      y: drag.startPan.y + event.clientY - drag.startY,
    })
  }, [])

  const stopPan = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) {
      return
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    dragRef.current = null
    setIsPanning(false)
  }, [])

  const resetPan = useCallback(() => {
    setPan(ZERO)
  }, [])

  return {
    pan,
    isPanning,
    resetPan,
    canvasHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: stopPan,
      onPointerCancel: stopPan,
      onLostPointerCapture: stopPan,
    },
  }
}
