import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, it } from 'node:test'

import { createStore } from '../src/store.js'

describe('local JSON store', () => {
  it('persists created campaigns to a JSON file', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'nyec-local-api-'))
    const dataFile = join(directory, 'state.json')

    try {
      const firstStore = createStore({ dataFile })
      const campaign = firstStore.createCampaign({
        name: 'Persistence Test',
        facility: 'Test Facility',
        dailyLimit: 25,
        estimatedRecipients: 75
      })

      const secondStore = createStore({ dataFile })
      const campaigns = secondStore.campaigns()

      assert.equal(campaign.name, 'Persistence Test')
      assert.equal(campaigns.at(-1).name, 'Persistence Test')
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
})
