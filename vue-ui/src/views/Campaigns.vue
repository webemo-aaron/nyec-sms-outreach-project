<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  api,
  demoCampaignDetail,
  demoCampaignDispatchBatches,
  demoCampaigns,
  facilityName,
  type CampaignDetail,
  type CampaignDispatchBatch,
  type CampaignSummary
} from '../api/client'

const campaigns = ref<CampaignSummary[]>([])
const campaignSource = ref<'live' | 'demo'>('live')
const listError = ref('')
const selectedCampaignId = ref<string>('')
const selectedCampaign = ref<CampaignDetail | null>(null)
const selectedDispatchBatches = ref<CampaignDispatchBatch[]>([])
const detailError = ref('')
const actionError = ref('')
const actionMessage = ref('')
const activeAction = ref('')

async function loadCampaigns() {
  listError.value = ''

  try {
    campaigns.value = await api.listCampaigns()
    campaignSource.value = 'live'
  } catch (error) {
    campaigns.value = demoCampaigns
    campaignSource.value = 'demo'
    listError.value = error instanceof Error ? error.message : 'Unable to load campaigns.'
  }

  if (!selectedCampaignId.value && campaigns.value[0]) {
    await selectCampaign(campaigns.value[0].id)
  }
}

async function loadCampaignDispatches(id: string | number) {
  try {
    selectedDispatchBatches.value = await api.listCampaignDispatchBatches(id)
  } catch {
    selectedDispatchBatches.value = String(id) === String(demoCampaignDetail.id) ? demoCampaignDispatchBatches : []
  }
}

async function selectCampaign(id: string | number) {
  selectedCampaignId.value = String(id)
  detailError.value = ''

  try {
    selectedCampaign.value = await api.getCampaign(id)
  } catch (error) {
    selectedCampaign.value = String(id) === String(demoCampaignDetail.id) ? demoCampaignDetail : null
    detailError.value = error instanceof Error ? error.message : 'Unable to load campaign detail.'
  }

  await loadCampaignDispatches(id)
}

async function runAction(kind: 'launch' | 'pause' | 'dispatch', id: string | number) {
  activeAction.value = `${kind}:${id}`
  actionError.value = ''
  actionMessage.value = ''

  try {
    if (kind === 'launch') {
      const result = await api.launchCampaign(id)
      actionMessage.value = `Campaign ${result.name} is now ${result.status}.`
    } else if (kind === 'pause') {
      const result = await api.pauseCampaign(id)
      actionMessage.value = `Campaign ${result.name} is now ${result.status}.`
    } else {
      const result = await api.runCampaignDispatch(id)
      actionMessage.value = `Manual dispatch ${result.id} returned status ${result.status}.`
    }

    await loadCampaigns()
    await selectCampaign(id)
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : 'Unable to perform campaign action.'
  } finally {
    activeAction.value = ''
  }
}

onMounted(loadCampaigns)
</script>

<template>
  <section class="page-title">
    <h1>Outreach Campaigns</h1>
    <p>Work with the real campaign list, inspect detail, and trigger launch, pause, or manual dispatch against the Node API.</p>
  </section>

  <section class="section">
    <div v-if="campaignSource === 'live'" class="surface-note good">
      <p>Campaigns are loading from the Node API.</p>
    </div>
    <div v-else class="surface-note warn">
      <p>Showing seeded campaigns because the campaign API load failed: {{ listError }}</p>
    </div>
  </section>

  <section class="grid cols-2 section">
    <div class="card">
      <div class="section-header">
        <div>
          <h2>Campaign List</h2>
          <p>Launch, pause, and manual dispatch stay visible even while backend endpoints are still coming online.</p>
        </div>
        <RouterLink class="btn" to="/campaigns/new">New Campaign</RouterLink>
      </div>

      <div v-if="campaigns.length" class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Facility</th>
              <th>Daily Limit</th>
              <th>Sent</th>
              <th>Remaining</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="campaign in campaigns" :key="campaign.id">
              <td>{{ campaign.name }}</td>
              <td>
                <span class="badge" :class="campaign.status === 'RUNNING' ? 'good' : campaign.status === 'PAUSED' ? 'warn' : 'neutral'">
                  {{ campaign.status }}
                </span>
              </td>
              <td>{{ facilityName(campaign) }}</td>
              <td>{{ campaign.dailyLimit }}</td>
              <td>{{ campaign.sent }}</td>
              <td>{{ campaign.remaining }}</td>
              <td>
                <div class="table-actions">
                  <button class="btn secondary" @click="selectCampaign(campaign.id)">Detail</button>
                  <button
                    class="btn"
                    :disabled="activeAction === `launch:${campaign.id}`"
                    @click="runAction('launch', campaign.id)"
                  >
                    Launch
                  </button>
                  <button
                    class="btn secondary"
                    :disabled="activeAction === `pause:${campaign.id}`"
                    @click="runAction('pause', campaign.id)"
                  >
                    Pause
                  </button>
                  <button
                    class="btn secondary"
                    :disabled="activeAction === `dispatch:${campaign.id}`"
                    @click="runAction('dispatch', campaign.id)"
                  >
                    Run Dispatch
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="empty-state">
        No campaigns have been returned yet.
      </div>

      <div v-if="actionMessage" class="surface-note good section">
        <p>{{ actionMessage }}</p>
      </div>
      <div v-if="actionError" class="surface-note bad section">
        <p>{{ actionError }}</p>
      </div>
    </div>

    <div class="card stack">
      <div class="section-header">
        <div>
          <h2>Selected Campaign Detail</h2>
          <p v-if="selectedCampaign">Inspect the live or fallback campaign payload and recent dispatch batches.</p>
          <p v-else>Select a campaign to load detail.</p>
        </div>
      </div>

      <div v-if="selectedCampaign">
        <table class="table">
          <tbody>
            <tr><td>Name</td><td>{{ selectedCampaign.name }}</td></tr>
            <tr><td>Status</td><td>{{ selectedCampaign.status }}</td></tr>
            <tr><td>Facility</td><td>{{ facilityName(selectedCampaign) }}</td></tr>
            <tr><td>NPI</td><td>{{ selectedCampaign.npiLocation }}</td></tr>
            <tr><td>Daily Limit</td><td>{{ selectedCampaign.dailyLimit }}</td></tr>
            <tr><td>MEF Batch</td><td>{{ selectedCampaign.mefBatchId ?? 'Not returned' }}</td></tr>
            <tr><td>Survey URL</td><td>{{ selectedCampaign.externalSurveyBaseUrl ?? 'Not returned' }}</td></tr>
          </tbody>
        </table>

        <div class="preview-box section">
          <strong>Message Body</strong>
          <p>{{ selectedCampaign.messageBody ?? 'Message body was not returned by the detail endpoint.' }}</p>
        </div>

        <div class="section">
          <h2>Recent Dispatch Batches</h2>
          <div v-if="selectedDispatchBatches.length" class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>Batch</th>
                  <th>Date</th>
                  <th>Selected</th>
                  <th>Sent</th>
                  <th>Delivered</th>
                  <th>Failed</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="batch in selectedDispatchBatches" :key="batch.id">
                  <td>{{ batch.id }}</td>
                  <td>{{ batch.dispatchDate ?? batch.createdAt ?? 'n/a' }}</td>
                  <td>{{ batch.selected }}</td>
                  <td>{{ batch.sent }}</td>
                  <td>{{ batch.delivered }}</td>
                  <td>{{ batch.failed }}</td>
                  <td>{{ batch.status }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="empty-state">
            No campaign dispatch batches were returned.
          </div>
        </div>
      </div>

      <div v-else class="empty-state">
        Campaign detail is not available yet.
      </div>

      <div v-if="detailError" class="surface-note bad">
        <p>{{ detailError }}</p>
      </div>
    </div>
  </section>
</template>
