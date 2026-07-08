<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { api } from '../api/client'
const saved = ref(false)
const form = reactive({
  name: '1115 Waiver Outreach - Wave 2',
  customerName: 'NYC Health Partner',
  facilityName: 'NYC Health Center A',
  facilityCode: 'NYC-A',
  npiLocation: '1234567890',
  mefBatchId: 12,
  dailyLimit: 50,
  startDate: '2026-07-13',
  startTime: '09:00',
  externalSurveyBaseUrl: 'https://survey.customer.org/register',
  smsBody: 'Hello {{FirstName}}, your healthcare provider has requested that you complete a secure questionnaire. Please visit {{SurveyLink}}. Reply STOP to opt out.'
})
async function save() {
  await api.createCampaign(form)
  saved.value = true
}
const messagePreview = computed(() =>
  form.smsBody
    .replace('{{FirstName}}', 'Maria')
    .replace('{{SurveyLink}}', `${form.externalSurveyBaseUrl}?t=secure-token`)
)
</script>

<template>
  <section class="page-title">
    <h1>Campaign Wizard</h1>
    <p>Configure campaign scope, MEF cohort, SMS content, external survey destination, and daily execution limit.</p>
  </section>
  <section class="grid cols-2 section">
    <div class="card form">
      <h2>1. Campaign Details</h2>
      <div class="field"><label>Campaign Name</label><input v-model="form.name" /></div>
      <div class="field"><label>Customer</label><input v-model="form.customerName" /></div>
      <div class="field"><label>Facility</label><input v-model="form.facilityName" /></div>
      <div class="field"><label>NPI Location</label><input v-model="form.npiLocation" /></div>
      <h2>2. Cohort Source</h2>
      <div class="field"><label>MEF Batch</label><select v-model="form.mefBatchId"><option :value="12">2026-W28 · 45,110 valid members</option></select></div>
      <h2>3. Execution Rules</h2>
      <div class="field"><label>Daily Limit</label><input type="number" v-model="form.dailyLimit" /></div>
      <div class="field"><label>Start Date</label><input type="date" v-model="form.startDate" /></div>
      <div class="field"><label>Start Time</label><input v-model="form.startTime" /></div>
    </div>
    <div class="card form">
      <h2>4. External Survey Link</h2>
      <div class="field"><label>Base URL</label><input v-model="form.externalSurveyBaseUrl" /></div>
      <h2>5. Customer SMS Message</h2>
      <div class="field"><label>Message Body</label><textarea rows="8" v-model="form.smsBody" /></div>
      <p class="metric-label">Variables supported: <span v-text="'{{FirstName}}'" />, <span v-text="'{{SurveyLink}}'" />, <span v-text="'{{Facility}}'" /></p>
      <div class="card" style="box-shadow:none;">
        <h2>Preview</h2>
        <p>{{ messagePreview }}</p>
      </div>
      <div class="actions"><button class="btn" @click="save">Save Draft</button><button class="btn secondary">Submit for Launch</button></div>
      <p v-if="saved" class="badge good">Draft saved through API/mock fallback.</p>
    </div>
  </section>
</template>
