import test from 'node:test'
import assert from 'node:assert/strict'
import {
  AUTO_ROTATE_DELAY_MS,
  AUTO_ROTATE_SPEED,
  FULL_TURN,
  normalizeAngle,
  rotateByElapsedTime,
} from './rotationMath.ts'

test('normalizeAngle keeps rotation inside one positive turn', () => {
  assert.equal(normalizeAngle(0), 0)
  assert.equal(normalizeAngle(FULL_TURN), 0)
  assert.equal(normalizeAngle(-Math.PI), Math.PI)
  assert.equal(normalizeAngle(FULL_TURN + Math.PI / 2), Math.PI / 2)
})

test('rotateByElapsedTime advances slowly and wraps around', () => {
  assert.equal(AUTO_ROTATE_DELAY_MS, 2000)
  assert.equal(AUTO_ROTATE_SPEED, 0.000035)

  const advanced = rotateByElapsedTime(1, 1000)
  assert.equal(advanced, normalizeAngle(1 + AUTO_ROTATE_SPEED * 1000))

  const wrapped = rotateByElapsedTime(FULL_TURN - 0.001, 1000)
  assert.ok(wrapped >= 0)
  assert.ok(wrapped < FULL_TURN)
})
