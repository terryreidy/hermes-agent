import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import {
  AUTO_ROTATE_DELAY_MS,
  DRAG_ROTATION_SENSITIVITY,
  normalizeAngle,
  rotateByElapsedTime,
} from './rotationMath'

interface UseConstellationRotationOptions {
  initialRotation?: number
  autoRotatePaused?: boolean
}

export function useConstellationRotation({
  initialRotation = 0,
  autoRotatePaused = false,
}: UseConstellationRotationOptions = {}) {
  const [rotation, setRotation] = useState(initialRotation)
  const [isRotating, setIsRotating] = useState(false)
  const [isAutoRotating, setIsAutoRotating] = useState(false)
  const dragRef = useRef<{ pointerId: number; startX: number; startRotation: number } | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const lastFrameTimeRef = useRef<number | null>(null)
  const resumeTimerRef = useRef<number | null>(null)
  const autoRotatePausedRef = useRef(autoRotatePaused)
  const autoRotateRunningRef = useRef(false)
  const autoRotateResumeAtRef = useRef(Number.POSITIVE_INFINITY)

  const clearResumeTimer = useCallback(() => {
    if (resumeTimerRef.current === null) {
      return
    }

    window.clearTimeout(resumeTimerRef.current)
    resumeTimerRef.current = null
  }, [])

  const stopAutoRotate = useCallback(() => {
    autoRotateRunningRef.current = false
    autoRotateResumeAtRef.current = Number.POSITIVE_INFINITY

    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    lastFrameTimeRef.current = null
    setIsAutoRotating(false)
  }, [])

  const tickAutoRotate = useCallback(function tick(timestamp: number) {
    if (!autoRotateRunningRef.current || autoRotatePausedRef.current || dragRef.current) {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      lastFrameTimeRef.current = null
      setIsAutoRotating(false)
      return
    }

    const previousTimestamp = lastFrameTimeRef.current ?? timestamp
    const elapsedMs = timestamp - previousTimestamp
    lastFrameTimeRef.current = timestamp

    setRotation((currentRotation) => rotateByElapsedTime(currentRotation, elapsedMs))
    animationFrameRef.current = window.requestAnimationFrame(tick)
  }, [])

  const startAutoRotate = useCallback(() => {
    if (
      autoRotatePausedRef.current
      || dragRef.current
      || animationFrameRef.current !== null
      || performance.now() < autoRotateResumeAtRef.current
    ) {
      return
    }

    lastFrameTimeRef.current = null
    autoRotateRunningRef.current = true
    setIsAutoRotating(true)
    animationFrameRef.current = window.requestAnimationFrame(tickAutoRotate)
  }, [tickAutoRotate])

  const scheduleAutoRotateResume = useCallback(() => {
    if (autoRotatePausedRef.current || dragRef.current) {
      return
    }

    clearResumeTimer()
    autoRotateResumeAtRef.current = performance.now() + AUTO_ROTATE_DELAY_MS
    resumeTimerRef.current = window.setTimeout(() => {
      resumeTimerRef.current = null
      startAutoRotate()
    }, AUTO_ROTATE_DELAY_MS)
  }, [clearResumeTimer, startAutoRotate])

  const pauseAutoRotate = useCallback(() => {
    clearResumeTimer()
    stopAutoRotate()
  }, [clearResumeTimer, stopAutoRotate])

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) {
      return
    }

    const target = event.target as HTMLElement
    if (target.closest('button, a, [data-no-canvas-rotate="true"]')) {
      return
    }

    pauseAutoRotate()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startRotation: rotation,
    }
    setIsRotating(true)
  }, [pauseAutoRotate, rotation])

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
    scheduleAutoRotateResume()
  }, [scheduleAutoRotateResume])

  const resetRotation = useCallback(() => {
    setRotation(initialRotation)
    pauseAutoRotate()
    scheduleAutoRotateResume()
  }, [initialRotation, pauseAutoRotate, scheduleAutoRotateResume])

  useLayoutEffect(() => {
    autoRotatePausedRef.current = autoRotatePaused

    if (autoRotatePaused) {
      pauseAutoRotate()
      return clearResumeTimer
    }

    scheduleAutoRotateResume()
    return clearResumeTimer
  }, [autoRotatePaused, clearResumeTimer, pauseAutoRotate, scheduleAutoRotateResume])

  useEffect(() => {
    return () => {
      clearResumeTimer()
      stopAutoRotate()
    }
  }, [clearResumeTimer, stopAutoRotate])

  return {
    rotation,
    isRotating,
    isAutoRotating,
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
