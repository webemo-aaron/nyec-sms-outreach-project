<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api, demoBillingSummary, type BillingSummary } from '../api/client'

const data = ref<BillingSummary>(demoBillingSummary)
const source = ref<'live' | 'demo'>('live')
const loadError = ref('')

function money(value: number | undefined) {
  return Number.isFinite(value) ? `$${Number(value).toFixed(2)}` : 'Not configured'
}

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
    <p>Review billing summary.</p>
  </section>

  <section v-if="source === 'demo'" class="section">
    <div class="surface-note warn">
      <p>Unable to refresh billing: {{ loadError }}</p>
    </div>
  </section>

  <section class="grid cols-4 section">
    <div class="card metric"><div><div class="metric-label">Billable Messages</div><div class="metric-value">{{ data.billableMessages }}</div></div></div>
    <div class="card metric"><div><div class="metric-label">Delivered</div><div class="metric-value">{{ data.deliveredMessages }}</div></div></div>
    <div class="card metric"><div><div class="metric-label">Twilio Cost</div><div class="metric-value">{{ money(data.twilioCost) }}</div></div></div>
    <div class="card metric"><div><div class="metric-label">Invoice Estimate</div><div class="metric-value">{{ money(data.estimatedInvoice) }}</div></div></div>
  </section>

  <section class="card section">
    <div class="section-header">
      <div>
        <h2>Invoice Preview · {{ data.period }}</h2>
        <p v-if="data.lastUpdatedAt">Last updated: {{ data.lastUpdatedAt }}</p>
      </div>
      <RouterLink class="btn secondary" to="/admin">Admin</RouterLink>
    </div>

    <table class="table">
      <thead><tr><th>Line Item</th><th>Qty</th><th>Amount</th></tr></thead>
      <tbody>
        <tr><td>Platform Fee</td><td>1</td><td>{{ money(data.platformFee) }}</td></tr>
        <tr><td>Twilio Pass-Through</td><td>{{ data.deliveredMessages }}</td><td>{{ money(data.twilioCost) }}</td></tr>
        <tr><td>Estimated Gross Margin</td><td>—</td><td>{{ money(data.grossMargin) }}</td></tr>
      </tbody>
    </table>
  </section>
</template>
