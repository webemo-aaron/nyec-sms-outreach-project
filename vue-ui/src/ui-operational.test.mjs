import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const srcDir = dirname(fileURLToPath(import.meta.url))
const routerSource = readFileSync(join(srcDir, 'router.ts'), 'utf8')
const appSource = readFileSync(join(srcDir, 'App.vue'), 'utf8')
const commandCenterSource = readFileSync(join(srcDir, 'views', 'CommandCenter.vue'), 'utf8')
const mefIntakeSource = readFileSync(join(srcDir, 'views', 'MefIntake.vue'), 'utf8')
const wizardFlowsPath = join(srcDir, 'components', 'wizardFlows.ts')

test('keeps operational UI routes and legacy aliases available', () => {
  assert.match(routerSource, /path:\s*'\/command-center'[\s\S]*alias:\s*'\/dashboard'/)
  assert.match(routerSource, /path:\s*'\/mef-intake'[\s\S]*alias:\s*'\/mef'/)
  assert.match(routerSource, /path:\s*'\/campaigns'/)
  assert.match(routerSource, /path:\s*'\/dispatches'/)
  assert.match(routerSource, /path:\s*'\/twilio'/)
  assert.match(routerSource, /path:\s*'\/billing'/)
  assert.match(routerSource, /path:\s*'\/admin'/)
})

test('uses admin command-center navigation labels without a primary campaign wizard page', () => {
  assert.match(appSource, />Command Center</)
  assert.match(appSource, />Cohorts</)
  assert.match(appSource, />Campaigns</)
  assert.match(appSource, />Send Activity</)
  assert.match(appSource, />Twilio</)
  assert.match(appSource, />Billing</)
  assert.match(appSource, />Admin</)
  assert.doesNotMatch(appSource, />MEF Intake</)
  assert.doesNotMatch(appSource, />Campaign Wizard</)
  assert.doesNotMatch(appSource, />Dispatches</)
})

test('command center exposes the five primary modal wizard actions', () => {
  for (const action of ['Import Cohort', 'Create Campaign', 'Run Dispatch', 'Send Twilio Test', 'Reset Local Data']) {
    assert.match(commandCenterSource, new RegExp(`>${action}<`))
  }
})

test('admin UI source stays operator-only and avoids customer or patient page language', () => {
  const uiSources = [
    appSource,
    commandCenterSource,
    mefIntakeSource,
    readFileSync(join(srcDir, 'views', 'Campaigns.vue'), 'utf8'),
    readFileSync(join(srcDir, 'views', 'Dispatches.vue'), 'utf8'),
    readFileSync(join(srcDir, 'views', 'TwilioConfig.vue'), 'utf8'),
    readFileSync(join(srcDir, 'views', 'Admin.vue'), 'utf8')
  ].join('\n')

  assert.doesNotMatch(uiSources, /customer-facing/i)
  assert.doesNotMatch(uiSources, /patient-facing/i)
  assert.doesNotMatch(uiSources, /patient portal/i)
})

test('visible UI copy avoids implementation source-status wording', () => {
  const uiSources = [
    appSource,
    commandCenterSource,
    mefIntakeSource,
    readFileSync(join(srcDir, 'views', 'Campaigns.vue'), 'utf8'),
    readFileSync(join(srcDir, 'views', 'Dispatches.vue'), 'utf8'),
    readFileSync(join(srcDir, 'views', 'TwilioConfig.vue'), 'utf8'),
    readFileSync(join(srcDir, 'views', 'Admin.vue'), 'utf8'),
    readFileSync(join(srcDir, 'views', 'Billing.vue'), 'utf8'),
    readFileSync(join(srcDir, 'views', 'CampaignWizard.vue'), 'utf8'),
    readFileSync(join(srcDir, 'components', 'AdminWizardModal.vue'), 'utf8')
  ].join('\n')

  for (const phrase of [
    'Node API',
    'API:',
    'loaded.',
    'Seeded',
    'seeded',
    'Using live metrics',
    'data source',
    'External Survey Base URL',
    'survey.customer.org',
    'http://localhost:3001',
    'Auth Token Secret Ref'
  ]) {
    assert.doesNotMatch(uiSources, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'))
  }
})

test('Twilio UI uses env From Number instead of Messaging Service setup', () => {
  const twilioSources = [
    readFileSync(join(srcDir, 'views', 'TwilioConfig.vue'), 'utf8'),
    readFileSync(join(srcDir, 'components', 'AdminWizardModal.vue'), 'utf8')
  ].join('\n')

  assert.match(twilioSources, /From Number/)
  assert.match(twilioSources, /Account SID/)
  assert.doesNotMatch(twilioSources, /Messaging Service SID/)
})

test('does not expose internal source-system wording in MEF intake UI', () => {
  assert.doesNotMatch(mefIntakeSource, new RegExp('name' + 'space', 'i'))
  assert.doesNotMatch(mefIntakeSource, new RegExp('hx' + 'common', 'i'))
})

test('modal wizard flow definitions keep the approved step order', () => {
  assert.equal(existsSync(wizardFlowsPath), true, 'wizard flow definitions file should exist')
  const wizardFlowSource = readFileSync(wizardFlowsPath, 'utf8')

  const expectedFlows = {
    cohortImport: ['input', 'review', 'result'],
    campaign: ['cohort', 'settings', 'message', 'review', 'result'],
    dispatch: ['campaign', 'eligibility', 'confirm', 'result'],
    twilioTest: ['config', 'send', 'result'],
    reset: ['warning', 'confirmation', 'result']
  }

  for (const [flowName, steps] of Object.entries(expectedFlows)) {
    const flowMatch = wizardFlowSource.match(new RegExp(`${flowName}:\\s*\\[([\\s\\S]*?)\\]`))
    assert.ok(flowMatch, `${flowName} flow should be defined`)
    const flowSource = flowMatch[1]
    let previousIndex = -1

    for (const step of steps) {
      const index = flowSource.indexOf(`id: '${step}'`)
      assert.ok(index > previousIndex, `${flowName} should include ${step} after the previous step`)
      previousIndex = index
    }
  }
})
