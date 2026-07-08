<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api, mockDashboard } from '../api/client'

const data = ref(mockDashboard)
onMounted(async () => { data.value = await api.dashboard() as typeof mockDashboard })
</script>

<template>
  <section class="page-title">
    <h1>Operations Command Center</h1>
    <p>Live control view for MEF-based SMS outreach execution, delivery, failures, retries, cost, and scheduler health.</p>
  </section>

  <section class="grid cols-4 section">
    <div class="card metric"><div><div class="metric-label">Active Campaigns</div><div class="metric-value">{{ data.activeCampaigns }}</div></div><span class="status-dot" /></div>
    <div class="card metric"><div><div class="metric-label">Messages Sent Today</div><div class="metric-value">{{ data.messagesSentToday }}</div></div><span class="status-dot" /></div>
    <div class="card metric"><div><div class="metric-label">Delivered Today</div><div class="metric-value">{{ data.deliveredToday }}</div></div><span class="status-dot" /></div>
    <div class="card metric"><div><div class="metric-label">Estimated Cost Today</div><div class="metric-value">${{ data.estimatedCostToday }}</div></div><span class="status-dot warn" /></div>
  </section>

  <section class="grid cols-2 section">
    <div class="card">
      <h2>Daily Execution Progress</h2>
      <div class="progress"><span :style="{ width: data.dailyProgress + '%' }"></span></div>
      <p class="metric-label">{{ data.messagesSentToday }} of {{ data.dailyLimit }} planned messages sent. Next scheduler: {{ data.nextSchedulerRun }}.</p>
      <div class="actions">
        <button class="btn">Pause All</button>
        <button class="btn secondary">View Failures</button>
      </div>
    </div>
    <div class="card">
      <h2>Twilio Health</h2>
      <table class="table">
        <tbody>
          <tr><td>Status</td><td><span class="badge good">{{ data.twilioStatus }}</span></td></tr>
          <tr><td>Failed</td><td>{{ data.failedToday }}</td></tr>
          <tr><td>Retry Pending</td><td>{{ data.retryPending }}</td></tr>
          <tr><td>Opt-Outs</td><td>{{ data.optOutsToday }}</td></tr>
        </tbody>
      </table>
    </div>
  </section>

  <section class="card section">
    <h2>Campaign Health</h2>
    <table class="table">
      <thead><tr><th>Campaign</th><th>Status</th><th>Facility</th><th>Sent</th><th>Remaining</th></tr></thead>
      <tbody>
        <tr v-for="campaign in data.campaigns" :key="campaign.id">
          <td>{{ campaign.name }}</td><td><span class="badge good">{{ campaign.status }}</span></td><td>{{ campaign.facility }}</td><td>{{ campaign.sent }}</td><td>{{ campaign.remaining }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
