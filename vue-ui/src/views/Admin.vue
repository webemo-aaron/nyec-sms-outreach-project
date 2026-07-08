<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api, demoAuditEvents, type AuditEvent, type ResetLocalDataResult } from '../api/client'

const auditEvents = ref<AuditEvent[]>([])
const auditSource = ref<'live' | 'demo'>('live')
const auditError = ref('')
const resetResult = ref<ResetLocalDataResult | null>(null)
const resetError = ref('')
const isResetting = ref(false)

async function loadAuditEvents() {
  try {
    auditEvents.value = await api.listAuditEvents()
    auditSource.value = 'live'
    auditError.value = ''
  } catch (error) {
    auditEvents.value = demoAuditEvents
    auditSource.value = 'demo'
    auditError.value = error instanceof Error ? error.message : 'Unable to load audit events.'
  }
}

async function resetLocalData() {
  const confirmed = window.confirm('Reset local API data for laptop testing?')
  if (!confirmed) return

  isResetting.value = true
  resetError.value = ''
  resetResult.value = null

  try {
    resetResult.value = await api.resetLocalData()
    await loadAuditEvents()
  } catch (error) {
    resetError.value = error instanceof Error ? error.message : 'Unable to reset local data.'
  } finally {
    isResetting.value = false
  }
}

function payloadText(payload: AuditEvent['payload']) {
  if (!payload) return 'No payload'
  if (typeof payload === 'string') return payload
  return JSON.stringify(payload)
}

onMounted(loadAuditEvents)
</script>

<template>
  <section class="page-title">
    <h1>Administration</h1>
    <p>Reset local data intentionally, then inspect recent audit activity to verify operational flows.</p>
  </section>

  <section class="grid cols-2 section">
    <div class="card form">
      <div class="section-header">
        <div>
          <h2>Local Reset</h2>
          <p>Keep this explicit. The button remains visible even before the backend route is ready.</p>
        </div>
      </div>

      <div class="surface-note warn">
        <p>This action is intended for laptop testing against the Node API only.</p>
      </div>

      <div class="actions">
        <button class="btn danger" :disabled="isResetting" @click="resetLocalData">
          {{ isResetting ? 'Resetting...' : 'Reset Local Data' }}
        </button>
        <RouterLink class="btn secondary" to="/billing">View Billing</RouterLink>
      </div>

      <div v-if="resetResult" class="surface-note good">
        <p>
          {{ resetResult.message ?? resetResult.status }}
          <span v-if="resetResult.deletedCampaigns !== undefined">
            Deleted campaigns: {{ resetResult.deletedCampaigns }}, dispatches: {{ resetResult.deletedDispatches ?? 0 }},
            messages: {{ resetResult.deletedMessages ?? 0 }}.
          </span>
        </p>
      </div>
      <div v-if="resetError" class="surface-note bad">
        <p>{{ resetError }}</p>
      </div>
    </div>

    <div class="card stack">
      <div class="section-header">
        <div>
          <h2>Audit Feed Status</h2>
          <p>Use this to confirm whether test actions are landing in the audit trail.</p>
        </div>
      </div>

      <div v-if="auditSource === 'live'" class="surface-note good">
        <p>Audit events are loading from the Node API.</p>
      </div>
      <div v-else class="surface-note warn">
        <p>Showing seeded audit events because the audit API load failed: {{ auditError }}</p>
      </div>
    </div>
  </section>

  <section class="card section">
    <div class="section-header">
      <div>
        <h2>Recent Audit Events</h2>
        <p>Newest events first.</p>
      </div>
    </div>

    <div v-if="auditEvents.length" class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>When</th>
            <th>Event</th>
            <th>Actor</th>
            <th>Payload</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="event in auditEvents" :key="event.id">
            <td>{{ event.createdAt }}</td>
            <td>{{ event.eventType }}</td>
            <td>{{ event.actor ?? 'system' }}</td>
            <td class="mono">{{ payloadText(event.payload) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="empty-state">
      No audit events have been returned yet.
    </div>
  </section>
</template>
