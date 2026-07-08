<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api, mockCampaigns } from '../api/client'
const campaigns = ref(mockCampaigns)
onMounted(async () => { campaigns.value = await api.campaigns() as typeof mockCampaigns })
</script>

<template>
  <section class="page-title">
    <h1>Outreach Campaigns</h1>
    <p>Create and control MEF-based SMS campaigns that dispatch at defined daily limits.</p>
  </section>
  <section class="card section">
    <div class="actions" style="justify-content: space-between; margin-bottom: 12px;">
      <RouterLink class="btn" to="/campaigns/new">New Campaign</RouterLink>
      <button class="btn secondary">Export</button>
    </div>
    <table class="table">
      <thead><tr><th>Name</th><th>Status</th><th>Facility</th><th>NPI</th><th>Daily Limit</th><th>Sent</th><th>Remaining</th><th>Actions</th></tr></thead>
      <tbody>
        <tr v-for="campaign in campaigns" :key="campaign.id">
          <td>{{ campaign.name }}</td>
          <td><span class="badge" :class="campaign.status === 'RUNNING' ? 'good' : campaign.status === 'PAUSED' ? 'warn' : ''">{{ campaign.status }}</span></td>
          <td>{{ campaign.facility }}</td>
          <td>{{ campaign.npiLocation }}</td>
          <td>{{ campaign.dailyLimit }}</td>
          <td>{{ campaign.sent }}</td>
          <td>{{ campaign.remaining }}</td>
          <td><button class="btn secondary">Manage</button></td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
