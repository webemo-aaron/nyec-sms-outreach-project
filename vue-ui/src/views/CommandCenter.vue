<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api, demoDashboard, facilityName, type DashboardSummary } from '../api/client'
import { useAdminWizard } from '../components/useAdminWizard'

const data = ref<DashboardSummary>(demoDashboard)
const source = ref<'live' | 'demo'>('live')
const loadError = ref('')
const { openWizard } = useAdminWizard()

async function loadDashboard() {
  try {
    data.value = await api.getDashboard()
    source.value = 'live'
    loadError.value = ''
  } catch (error) {
    data.value = demoDashboard
    source.value = 'demo'
    loadError.value = error instanceof Error ? error.message : 'Unable to load dashboard metrics.'
  }
}

onMounted(loadDashboard)
</script>

<template>
  <section class="page-title">
    <h1>Command Center</h1>
    <p>Campaign, Twilio, and dispatch status.</p>
  </section>

  <section v-if="source === 'demo'" class="section">
    <div class="surface-note warn">
      <p>Unable to refresh metrics: {{ loadError }}</p>
    </div>
  </section>

  <section class="card section">
    <div class="section-header">
      <div>
        <h2>Processing Actions</h2>
        <p>Start admin workflows.</p>
      </div>
    </div>
    <div class="actions">
      <button class="btn" type="button" @click="openWizard('cohortImport')">Import Cohort</button>
      <button class="btn" type="button" @click="openWizard('campaign')">Create Campaign</button>
      <button class="btn" type="button" @click="openWizard('dispatch')">Run Dispatch</button>
      <button class="btn secondary" type="button" @click="openWizard('twilioTest')">Send Twilio Test</button>
      <button class="btn danger" type="button" @click="openWizard('reset')">Reset Local Data</button>
    </div>
  </section>

  <section class="grid cols-4 section">
    <div class="card metric"><div><div class="metric-label">Active Campaigns</div><div class="metric-value">{{ data.activeCampaigns }}</div></div><span class="status-dot" /></div>
    <div class="card metric"><div><div class="metric-label">Sent Today</div><div class="metric-value">{{ data.messagesSentToday }}</div></div><span class="status-dot" /></div>
    <div class="card metric"><div><div class="metric-label">Delivered Today</div><div class="metric-value">{{ data.deliveredToday }}</div></div><span class="status-dot" /></div>
    <div class="card metric"><div><div class="metric-label">Est. Cost Today</div><div class="metric-value">${{ data.estimatedCostToday }}</div></div><span class="status-dot warn" /></div>
  </section>

  <section class="grid cols-2 section">
    <div class="card">
      <h2>Daily Progress</h2>
      <div class="progress"><span :style="{ width: `${data.dailyProgress}%` }"></span></div>
      <p class="metric-label">{{ data.messagesSentToday }} / {{ data.dailyLimit }} sent. Next run: {{ data.nextSchedulerRun }}.</p>
      <div class="actions">
        <RouterLink class="btn" to="/campaigns">Manage Campaigns</RouterLink>
        <RouterLink class="btn secondary" to="/dispatches">View Dispatches</RouterLink>
      </div>
    </div>
    <div class="card">
      <h2>Twilio Health</h2>
      <table class="table">
        <tbody>
          <tr><td>Status</td><td><span class="badge good">{{ data.twilioStatus }}</span></td></tr>
          <tr><td>Failed</td><td>{{ data.failedToday }}</td></tr>
          <tr><td>Pending Retry</td><td>{{ data.retryPending }}</td></tr>
          <tr><td>Opt-Outs</td><td>{{ data.optOutsToday }}</td></tr>
        </tbody>
      </table>
      <div class="actions section">
        <RouterLink class="btn secondary" to="/twilio">Settings</RouterLink>
      </div>
    </div>
  </section>

  <section class="card section">
    <h2>Campaign Health</h2>
    <table class="table">
      <thead><tr><th>Campaign</th><th>Status</th><th>Facility</th><th>Sent</th><th>Remaining</th></tr></thead>
      <tbody>
        <tr v-for="campaign in data.campaigns" :key="campaign.id">
          <td>{{ campaign.name }}</td>
          <td><span class="badge good">{{ campaign.status }}</span></td>
          <td>{{ facilityName(campaign) }}</td>
          <td>{{ campaign.sent }}</td>
          <td>{{ campaign.remaining }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
