<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api, mockDispatches } from '../api/client'
const dispatches = ref(mockDispatches)
onMounted(async () => { dispatches.value = await api.dispatches() as typeof mockDispatches })
</script>

<template>
  <section class="page-title">
    <h1>Dispatch Operations</h1>
    <p>Track daily scheduler batches, message queue, delivery state, retry state, and final outcomes.</p>
  </section>
  <section class="card section">
    <table class="table">
      <thead><tr><th>Batch</th><th>Campaign</th><th>Date</th><th>Selected</th><th>Sent</th><th>Delivered</th><th>Failed</th><th>Status</th></tr></thead>
      <tbody>
        <tr v-for="row in dispatches" :key="row.id">
          <td>{{ row.id }}</td><td>{{ row.campaign }}</td><td>{{ row.date }}</td><td>{{ row.selected }}</td><td>{{ row.sent }}</td><td>{{ row.delivered }}</td><td>{{ row.failed }}</td><td><span class="badge" :class="row.status === 'COMPLETE' ? 'good' : 'warn'">{{ row.status }}</span></td>
        </tr>
      </tbody>
    </table>
  </section>
  <section class="grid cols-2 section">
    <div class="card">
      <h2>Retry Queue</h2>
      <div class="timeline">
        <div class="timeline-item"><strong>09:05</strong><span>3 retryable Twilio failures scheduled for +30m</span></div>
        <div class="timeline-item"><strong>10:35</strong><span>1 permanent failure marked invalid number</span></div>
        <div class="timeline-item"><strong>11:00</strong><span>2 messages delivered after retry</span></div>
      </div>
    </div>
    <div class="card">
      <h2>Suppression Snapshot</h2>
      <table class="table"><tbody><tr><td>Opted Out</td><td>128</td></tr><tr><td>Invalid Phone</td><td>438</td></tr><tr><td>Already Messaged</td><td>840</td></tr></tbody></table>
    </div>
  </section>
</template>
