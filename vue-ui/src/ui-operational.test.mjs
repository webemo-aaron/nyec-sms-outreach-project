import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const srcDir = dirname(fileURLToPath(import.meta.url))
const routerSource = readFileSync(join(srcDir, 'router.ts'), 'utf8')
const mefIntakeSource = readFileSync(join(srcDir, 'views', 'MefIntake.vue'), 'utf8')

test('keeps operational UI routes and legacy aliases available', () => {
  assert.match(routerSource, /path:\s*'\/command-center'[\s\S]*alias:\s*'\/dashboard'/)
  assert.match(routerSource, /path:\s*'\/mef-intake'[\s\S]*alias:\s*'\/mef'/)
  assert.match(routerSource, /path:\s*'\/campaigns'/)
  assert.match(routerSource, /path:\s*'\/dispatches'/)
  assert.match(routerSource, /path:\s*'\/twilio'/)
  assert.match(routerSource, /path:\s*'\/billing'/)
  assert.match(routerSource, /path:\s*'\/admin'/)
})

test('does not expose internal source-system wording in MEF intake UI', () => {
  assert.doesNotMatch(mefIntakeSource, new RegExp('name' + 'space', 'i'))
  assert.doesNotMatch(mefIntakeSource, new RegExp('hx' + 'common', 'i'))
})
