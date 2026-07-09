<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  api,
  demoDispatches,
  demoOutboundMessages,
  dispatchCampaignName,
  type DispatchSummary,
  type OutboundMessage
} from '../api/client'
import { useAdminWizard } from '../components/useAdminWizard'

const dispatches = ref<DispatchSummary[]>([])
const dispatchSource = ref<'live' | 'demo'>('live')
const dispatchError = ref('')
const outboundMessages = ref<OutboundMessage[]>([])
const outboundSource = ref<'live' | 'demo'>('live')
const outboundError = ref('')
const { openWizard } = useAdminWizard()

async function loadDispatches() {
  try {
    dispatches.value = await api.listDispatches()
    dispatchSource.value = 'live'
    dispatchError.value = ''
  } catch (error) {
    dispatches.value = demoDispatches
    dispatchSource.value = 'demo'
    dispatchError.value = error instanceof Error ? error.message : 'Unable to load dispatches.'
  }
}

async function loadOutboundMessages() {
  try {
    outboundMessages.value = await api.listOutboundMessages()
    outboundSource.value = 'live'
    outboundError.value = ''
  } catch (error) {
    outboundMessages.value = demoOutboundMessages
    outboundSource.value = 'demo'
    outboundError.value = error instanceof Error ? error.message : 'Unable to load outbound messages.'
  }
}

onMounted(async () => {
  await Promise.all([loadDispatches(), loadOutboundMessages()])
})
</script>

<template>
  <section class="page-title">
    <h1>Send Activity</h1>
    <p>Monitor dispatch batches, outbound attempts, and Twilio callbacks.</p>
    <div class="actions section">
      <button class="btn" type="button" @click="openWizard('dispatch')">Run Dispatch</button>
      <button class="btn secondary" type="button" @click="openWizard('twilioTest')">Send Twilio Test</button>
    </div>
  </section>

  <section v-if="dispatchSource === 'demo'" class="section">
    <div class="surface-note warn">
      <p>Unable to refresh dispatches: {{ dispatchError }}</p>
    </div>
  </section>

  <section class="card section">
    <div class="section-header">
      <div>
        <h2>Dispatch Batches</h2>
        <p>Compare send counts and delivery outcomes.</p>
      </div>
    </div>

    <div v-if="dispatches.length" class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Batch</th>
            <th>Campaign</th>
            <th>Date</th>
            <th>Selected</th>
            <th>Sent</th>
            <th>Delivered</th>
            <th>Failed</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in dispatches" :key="row.id">
            <td>{{ row.id }}</td>
            <td>{{ dispatchCampaignName(row) }}</td>
            <td>{{ row.dispatchDate ?? row.date ?? row.createdAt ?? 'n/a' }}</td>
            <td>{{ row.selected }}</td>
            <td>{{ row.sent }}</td>
            <td>{{ row.delivered }}</td>
            <td>{{ row.failed }}</td>
            <td><span class="badge" :class="row.status === 'COMPLETE' ? 'good' : 'warn'">{{ row.status }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="empty-state">
      No dispatch batches found.
    </div>
  </section>

  <section v-if="outboundSource === 'demo'" class="section">
    <div class="surface-note warn">
      <p>Unable to refresh outbound messages: {{ outboundError }}</p>
    </div>
  </section>

  <section class="card section">
    <div class="section-header">
      <div>
        <h2>Outbound Messages and Callback Status</h2>
        <p>Track callback progress and terminal failures.</p>
      </div>
    </div>

    <div v-if="outboundMessages.length" class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Message</th>
            <th>Dispatch</th>
            <th>Campaign</th>
            <th>To</th>
            <th>Provider</th>
            <th>Callback</th>
            <th>Last Update</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="message in outboundMessages" :key="message.id">
            <td class="mono">{{ message.id }}</td>
            <td>{{ message.dispatchId ?? 'n/a' }}</td>
            <td>{{ message.campaignName ?? 'Unknown campaign' }}</td>
            <td>{{ message.to }}</td>
            <td><span class="badge" :class="message.providerStatus === 'failed' ? 'bad' : 'good'">{{ message.providerStatus }}</span></td>
            <td>{{ message.callbackStatus ?? 'pending' }}</td>
            <td>{{ message.updatedAt ?? message.attemptedAt ?? 'n/a' }}</td>
            <td>{{ message.errorMessage ?? message.bodyPreview }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="empty-state">
      No outbound messages found.
    </div>
  </section>
</template>
