<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api } from '../api/client'
const data = ref({ period: 'July 2026', billableMessages: 0, deliveredMessages: 0, twilioCost: 0, platformFee: 0, estimatedInvoice: 0, grossMargin: 0 })
onMounted(async () => { data.value = await api.billing() as typeof data.value })
</script>

<template>
  <section class="page-title">
    <h1>Billing & Cost</h1>
    <p>Track usage, Twilio pass-through cost, invoice preview, and gross margin by billing period.</p>
  </section>
  <section class="grid cols-4 section">
    <div class="card metric"><div><div class="metric-label">Billable Messages</div><div class="metric-value">{{ data.billableMessages }}</div></div></div>
    <div class="card metric"><div><div class="metric-label">Delivered</div><div class="metric-value">{{ data.deliveredMessages }}</div></div></div>
    <div class="card metric"><div><div class="metric-label">Twilio Cost</div><div class="metric-value">${{ data.twilioCost }}</div></div></div>
    <div class="card metric"><div><div class="metric-label">Invoice Estimate</div><div class="metric-value">${{ data.estimatedInvoice }}</div></div></div>
  </section>
  <section class="card section">
    <h2>Invoice Preview · {{ data.period }}</h2>
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
