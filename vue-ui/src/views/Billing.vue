<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api, demoBillingSummary, type BillingSummary } from '../api/client'

const data = ref<BillingSummary>(demoBillingSummary)
const source = ref<'live' | 'demo'>('live')
const loadError = ref('')

async function loadBilling() {
  try {
    data.value = await api.getBillingSummary()
    source.value = 'live'
    loadError.value = ''
  } catch (error) {
    data.value = demoBillingSummary
    source.value = 'demo'
    loadError.value = error instanceof Error ? error.message : 'Unable to load billing summary.'
  }
}

onMounted(loadBilling)
</script>

<template>
  <section class="page-title">
    <h1>Billing & Cost</h1>
    <p>Track billing summary output from the local API without pretending seeded cost data is live.</p>
  </section>

  <section class="section">
    <div v-if="source === 'live'" class="surface-note good">
      <p>Billing summary is loading from the Node API.</p>
    </div>
    <div v-else class="surface-note warn">
      <p>Showing seeded billing data because the billing API load failed: {{ loadError }}</p>
    </div>
  </section>

  <section class="grid cols-4 section">
    <div class="card metric"><div><div class="metric-label">Billable Messages</div><div class="metric-value">{{ data.billableMessages }}</div></div></div>
    <div class="card metric"><div><div class="metric-label">Delivered</div><div class="metric-value">{{ data.deliveredMessages }}</div></div></div>
    <div class="card metric"><div><div class="metric-label">Twilio Cost</div><div class="metric-value">${{ data.twilioCost }}</div></div></div>
    <div class="card metric"><div><div class="metric-label">Invoice Estimate</div><div class="metric-value">${{ data.estimatedInvoice }}</div></div></div>
  </section>

  <section class="card section">
    <div class="section-header">
      <div>
        <h2>Invoice Preview · {{ data.period }}</h2>
        <p v-if="data.lastUpdatedAt">Last updated: {{ data.lastUpdatedAt }}</p>
      </div>
      <RouterLink class="btn secondary" to="/admin">Audit and Reset</RouterLink>
    </div>

    <table class="table">
      <thead><tr><th>Line Item</th><th>Qty</th><th>Amount</th></tr></thead>
      <tbody>
        <tr><td>Platform Fee</td><td>1</td><td>${{ data.platformFee }}</td></tr>
        <tr><td>Twilio Pass-Through</td><td>{{ data.deliveredMessages }}</td><td>${{ data.twilioCost }}</td></tr>
        <tr><td>Estimated Gross Margin</td><td>—</td><td>${{ data.grossMargin }}</td></tr>
      </tbody>
    </table>
  </section>
</template>
