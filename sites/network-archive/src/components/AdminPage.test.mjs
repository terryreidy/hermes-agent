import assert from 'node:assert/strict'
import test from 'node:test'

import { textToTags } from '../adminTags.ts'

test('textToTags allows comma-separated tag entry with spaces and punctuation', () => {
  assert.deepEqual(textToTags('AI, archive, Melbourne policy'), ['AI', 'archive', 'Melbourne policy'])
})
