import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const contractsPath = join(dirname(fileURLToPath(import.meta.url)), 'contracts.ts')
const source = readFileSync(contractsPath, 'utf8')

test('declares canonical operational route paths', () => {
  assert.match(source, /mefBatches:\s*'\/mef\/batches'/)
  assert.match(source, /campaignRunDispatch[\s\S]*\/campaigns\/\$\{encodePathSegment\(id\)\}\/dispatches/)
  assert.match(source, /outboundMessages:\s*'\/outbound-messages'/)
  assert.match(source, /resetLocalData:\s*'\/admin\/reset'/)
})

test('keeps API failure messages contextual', () => {
  assert.match(source, /context\.method/)
  assert.match(source, /context\.path/)
  assert.match(source, /request failed/)
})
