import { useCallback, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

const DRAG_ROTATION_SENSITIVITY = 0.006
const FULL_TURN = Math.PI * 2

function normalizeAngle(angle: number) {
  return ((angle % FULL_TURN) + FULL_TURN) % FULL_TURN
}

export function useConstellationRotation(initialRotation = 0) {
  const [rotation, setRotation] = useState(initialRotation)
  const [isRotating, setIsRotating] = useState(false)
  const dragRef = useRef<{ pointerId: number; startX: number; startRotation: number } | null>(null)

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) {
      return
    }

    const target = event.target as HTMLElement
    if (target.closest('button, a, [data-no-canvas-rotate="true"]')) {
      return
    }

    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startRotation: rotation,
    }
    setIsRotating(true)
  }, [rotation])

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) {
      return
    }

    const delta = event.clientX - drag.startX
    setRotation(normalizeAngle(drag.startRotation + delta * DRAG_ROTATION_SENSITIVITY))
  }, [])

  const stopRotation = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) {
      return
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    dragRef.current = null
    setIsRotating(false)
  }, [])

  const resetRotation = useCallback(() => {
    setRotation(initialRotation)
  }, [initialRotation])

  return {
    rotation,
    isRotating,
    resetRotation,
    rotationHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: stopRotation,
      onPointerCancel: stopRotation,
      onLostPointerCapture: stopRotation,
    },
  }
}
