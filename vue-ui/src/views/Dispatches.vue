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

const dispatches = ref<DispatchSummary[]>([])
const dispatchSource = ref<'live' | 'demo'>('live')
const dispatchError = ref('')
const outboundMessages = ref<OutboundMessage[]>([])
const outboundSource = ref<'live' | 'demo'>('live')
const outboundError = ref('')

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
    <h1>Dispatch Operations</h1>
    <p>Review dispatch batches, outbound message attempts, and Twilio callback state from the local operational API.</p>
  </section>

  <section class="section">
    <div v-if="dispatchSource === 'live'" class="surface-note good">
      <p>Dispatch batches are loading from the Node API.</p>
    </div>
    <div v-else class="surface-note warn">
      <p>Showing seeded dispatch rows because the dispatch list failed: {{ dispatchError }}</p>
    </div>
  </section>

  <section class="card section">
    <div class="section-header">
      <div>
        <h2>Dispatch Batches</h2>
        <p>Use this table to compare campaign-level send counts with delivery outcomes.</p>
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
      No dispatch batches have been returned yet.
    </div>
  </section>

  <section class="section">
    <div v-if="outboundSource === 'live'" class="surface-note good">
      <p>Outbound message rows are loading from the Node API.</p>
    </div>
    <div v-else class="surface-note warn">
      <p>Showing seeded outbound rows because the outbound message API failed: {{ outboundError }}</p>
    </div>
  </section>

  <section class="card section">
    <div class="section-header">
      <div>
        <h2>Outbound Messages and Callback Status</h2>
        <p>These rows should make callback progress and terminal failures visible during laptop testing.</p>
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
      No outbound messages have been returned yet.
    </div>
  </section>
</template>
