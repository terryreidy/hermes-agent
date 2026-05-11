export const DRAG_ROTATION_SENSITIVITY = 0.006
export const FULL_TURN = Math.PI * 2
export const AUTO_ROTATE_DELAY_MS = 2000
export const AUTO_ROTATE_SPEED = 0.000035

export function normalizeAngle(angle: number) {
  return ((angle % FULL_TURN) + FULL_TURN) % FULL_TURN
}

export function rotateByElapsedTime(rotation: number, elapsedMs: number) {
  return normalizeAngle(rotation + elapsedMs * AUTO_ROTATE_SPEED)
}
