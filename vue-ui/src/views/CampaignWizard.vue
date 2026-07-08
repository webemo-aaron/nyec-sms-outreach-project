<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  acceptedRows,
  api,
  demoMefBatchDetail,
  demoMefBatches,
  type CreateCampaignInput,
  type MefBatchDetail,
  type MefBatchSummary
} from '../api/client'

const batches = ref<MefBatchSummary[]>([])
const batchSource = ref<'live' | 'demo'>('live')
const batchError = ref('')
const selectedBatchDetail = ref<MefBatchDetail | null>(null)
const saveMessage = ref('')
const saveError = ref('')
const isSaving = ref(false)

const form = reactive<CreateCampaignInput>({
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
  smsBody:
    'Hello {{FirstName}}, your healthcare provider has requested that you complete a secure questionnaire. Please visit {{SurveyLink}}. Reply STOP to opt out.'
})

const messagePreview = computed(() =>
  form.smsBody
    .replace('{{FirstName}}', 'Maria')
    .replace('{{SurveyLink}}', `${form.externalSurveyBaseUrl ?? 'https://survey.customer.org/register'}?t=secure-token`)
)

async function loadBatches() {
  batchError.value = ''

  try {
    batches.value = await api.listMefBatches()
    batchSource.value = 'live'
  } catch (error) {
    batches.value = demoMefBatches
    batchSource.value = 'demo'
    batchError.value = error instanceof Error ? error.message : 'Unable to load MEF batches.'
  }

  if (!batches.value.some((batch) => String(batch.id) === String(form.mefBatchId)) && batches.value[0]) {
    form.mefBatchId = batches.value[0].id
  }
}

async function loadBatchDetail(id: string | number) {
  try {
    selectedBatchDetail.value = await api.getMefBatch(id)
  } catch {
    selectedBatchDetail.value = String(demoMefBatchDetail.id) === String(id) ? demoMefBatchDetail : null
  }
}

async function save() {
  isSaving.value = true
  saveMessage.value = ''
  saveError.value = ''

  try {
    const result = await api.createCampaign(form)
    saveMessage.value = `Campaign saved with status ${result.status} and id ${result.id}.`
  } catch (error) {
    saveError.value = error instanceof Error ? error.message : 'Unable to save campaign.'
  } finally {
    isSaving.value = false
  }
}

watch(
  () => form.mefBatchId,
  (id) => {
    void loadBatchDetail(id)
  },
  { immediate: true }
)

onMounted(loadBatches)
</script>

<template>
  <section class="page-title">
    <h1>Campaign Wizard</h1>
    <p>Select an imported MEF batch, set a daily dispatch limit, and save a campaign against the operational API.</p>
  </section>

  <section class="section">
    <div v-if="batchSource === 'live'" class="surface-note good">
      <p>MEF cohort choices are loading from the Node API.</p>
    </div>
    <div v-else class="surface-note warn">
      <p>Showing seeded batch choices because MEF load failed: {{ batchError }}</p>
    </div>
  </section>

  <section class="grid cols-2 section">
    <div class="card form">
      <div class="section-header">
        <div>
          <h2>Campaign Setup</h2>
          <p>Keep this page focused on laptop test workflows. Launch and manual dispatch happen from the campaign list after save.</p>
        </div>
      </div>

      <div class="field">
        <label>Campaign Name</label>
        <input v-model="form.name" />
      </div>

      <div class="form-grid">
        <div class="field">
          <label>Customer</label>
          <input v-model="form.customerName" />
        </div>
        <div class="field">
          <label>Facility</label>
          <input v-model="form.facilityName" />
        </div>
      </div>

      <div class="form-grid">
        <div class="field">
          <label>Facility Code</label>
          <input v-model="form.facilityCode" />
        </div>
        <div class="field">
          <label>NPI Location</label>
          <input v-model="form.npiLocation" />
        </div>
      </div>

      <div class="field">
        <label>MEF Batch</label>
        <select v-model="form.mefBatchId">
          <option v-for="batch in batches" :key="batch.id" :value="batch.id">
            {{ batch.mefVersion }} · {{ acceptedRows(batch) }} accepted · {{ batch.fileName }}
          </option>
        </select>
      </div>

      <div class="form-grid">
        <div class="field">
          <label>Daily Limit</label>
          <input v-model="form.dailyLimit" type="number" min="1" />
        </div>
        <div class="field">
          <label>Start Date</label>
          <input v-model="form.startDate" type="date" />
        </div>
      </div>

      <div class="field">
        <label>Start Time</label>
        <input v-model="form.startTime" />
      </div>

      <div class="field">
        <label>External Survey Base URL</label>
        <input v-model="form.externalSurveyBaseUrl" />
      </div>
    </div>

    <div class="card form">
      <div class="section-header">
        <div>
          <h2>Message and Cohort Preview</h2>
          <p>Preview the selected cohort count and the exact message body a tester is saving.</p>
        </div>
      </div>

      <div v-if="selectedBatchDetail" class="surface-note good">
        <p>
          Selected batch {{ selectedBatchDetail.mefVersion }} includes {{ acceptedRows(selectedBatchDetail) }} accepted rows and
          {{ selectedBatchDetail.rejectedRows }} rejected rows.
        </p>
      </div>
      <div v-else class="surface-note warn">
        <p>No batch detail is available for the currently selected MEF import.</p>
      </div>

      <div class="field">
        <label>Message Body</label>
        <textarea v-model="form.smsBody" rows="9" />
      </div>

      <p class="metric-label">Supported variables: <span v-text="'{{FirstName}}'" />, <span v-text="'{{SurveyLink}}'" />.</p>

      <div class="preview-box">
        <strong>Preview</strong>
        <p>{{ messagePreview }}</p>
      </div>

      <div class="actions">
        <button class="btn" :disabled="isSaving" @click="save">{{ isSaving ? 'Saving...' : 'Save Campaign' }}</button>
        <RouterLink class="btn secondary" to="/campaigns">Go to Campaigns</RouterLink>
      </div>

      <div v-if="saveMessage" class="surface-note good">
        <p>{{ saveMessage }}</p>
      </div>
      <div v-if="saveError" class="surface-note bad">
        <p>{{ saveError }}</p>
      </div>
    </div>
  </section>
</template>
