<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api, mockMefBatches } from '../api/client'
const batches = ref(mockMefBatches)
onMounted(async () => { batches.value = await api.mefBatches() as typeof mockMefBatches })
</script>

<template>
  <section class="page-title">
    <h1>MEF Intake</h1>
    <p>Load, validate, version, and activate NYeC Medicaid Eligibility File batches for campaign cohort selection.</p>
  </section>

  <section class="grid cols-2 section">
    <div class="card">
      <h2>Register New MEF File</h2>
      <div class="form">
        <div class="field"><label>File Name</label><input value="NYeC_MEF_2026_07_13.csv" /></div>
        <div class="field"><label>MEF Version</label><input value="2026-W29" /></div>
        <div class="field"><label>Source Namespace</label><input value="hxcommon" /></div>
        <div class="actions"><button class="btn">Validate & Import</button><button class="btn secondary">Run Dry Check</button></div>
      </div>
    </div>
    <div class="card">
      <h2>Validation Rules</h2>
      <table class="table">
        <tbody>
          <tr><td>Required Fields</td><td><span class="badge good">Enabled</span></td></tr>
          <tr><td>Phone Normalization</td><td><span class="badge good">Enabled</span></td></tr>
          <tr><td>Duplicate Detection</td><td><span class="badge good">Enabled</span></td></tr>
          <tr><td>Archive Raw Source</td><td><span class="badge warn">Configure path</span></td></tr>
        </tbody>
      </table>
    </div>
  </section>

  <section class="card section">
    <h2>Import History</h2>
    <table class="table">
      <thead><tr><th>File</th><th>Version</th><th>Status</th><th>Total</th><th>Valid</th><th>Rejected</th><th>Imported</th></tr></thead>
      <tbody>
        <tr v-for="batch in batches" :key="batch.id">
          <td>{{ batch.fileName }}</td><td>{{ batch.mefVersion }}</td><td><span class="badge good">{{ batch.status }}</span></td><td>{{ batch.totalRows }}</td><td>{{ batch.validRows }}</td><td>{{ batch.rejectedRows }}</td><td>{{ batch.createdAt }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
