<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import {
  acceptedRows,
  api,
  demoMefBatchDetail,
  demoMefBatches,
  type MefBatchDetail,
  type MefBatchSummary
} from '../api/client'

const isLoading = ref(true)
const batchSource = ref<'live' | 'demo'>('live')
const batchError = ref('')
const batches = ref<MefBatchSummary[]>([])
const selectedBatchId = ref<string>('')
const selectedBatchDetail = ref<MefBatchDetail | null>(null)
const detailError = ref('')
const importError = ref('')
const importMessage = ref('')
const isImporting = ref(false)

const form = reactive({
  fileName: 'NYeC_MEF_2026_07_13.csv',
  mefVersion: '2026-W29',
  csvText: ''
})

async function loadBatches() {
  isLoading.value = true
  batchError.value = ''

  try {
    batches.value = await api.listMefBatches()
    batchSource.value = 'live'
  } catch (error) {
    batches.value = demoMefBatches
    batchSource.value = 'demo'
    batchError.value = error instanceof Error ? error.message : 'Unable to load MEF batches.'
  } finally {
    isLoading.value = false
  }

  if (!selectedBatchId.value && batches.value.length > 0) {
    selectedBatchId.value = String(batches.value[0].id)
    await loadBatchDetail(selectedBatchId.value)
  }
}

async function loadBatchDetail(id: string) {
  detailError.value = ''
  selectedBatchId.value = id

  try {
    selectedBatchDetail.value = await api.getMefBatch(id)
  } catch (error) {
    if (String(demoMefBatchDetail.id) === id) {
      selectedBatchDetail.value = demoMefBatchDetail
    } else {
      selectedBatchDetail.value = null
    }
    detailError.value = error instanceof Error ? error.message : 'Unable to load MEF batch detail.'
  }
}

async function importBatch() {
  isImporting.value = true
  importError.value = ''
  importMessage.value = ''

  try {
    const detail = await api.importMefBatch({
      fileName: form.fileName,
      mefVersion: form.mefVersion,
      csvText: form.csvText
    })

    importMessage.value = `Imported ${acceptedRows(detail)} accepted rows and ${detail.rejectedRows} rejected rows.`
    selectedBatchDetail.value = detail
    selectedBatchId.value = String(detail.id)
    await loadBatches()
  } catch (error) {
    importError.value = error instanceof Error ? error.message : 'Unable to import the MEF batch.'
  } finally {
    isImporting.value = false
  }
}

async function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  form.fileName = file.name
  form.csvText = await file.text()
}

onMounted(loadBatches)
</script>

<template>
  <section class="page-title">
    <h1>MEF Intake</h1>
    <p>Paste or upload CSV content, import it through the operational API, and inspect accepted versus rejected counts.</p>
  </section>

  <section class="section">
    <div v-if="batchSource === 'live'" class="surface-note good">
      <p>Recent MEF batches are loading from the local Node API.</p>
    </div>
    <div v-else class="surface-note warn">
      <p>Showing seeded MEF history because the batch API load failed: {{ batchError }}</p>
    </div>
  </section>

  <section class="grid cols-2 section">
    <div class="card form">
      <div class="section-header">
        <div>
          <h2>Import New MEF Batch</h2>
          <p>Use raw CSV text from your laptop test file. The UI keeps the workflow visible even if the API route is still unavailable.</p>
        </div>
      </div>

      <div class="form-grid">
        <div class="field">
          <label>File Name</label>
          <input v-model="form.fileName" />
        </div>
        <div class="field">
          <label>MEF Version</label>
          <input v-model="form.mefVersion" />
        </div>
      </div>

      <div class="field">
        <label>Upload CSV</label>
        <div class="file-picker">
          <input type="file" accept=".csv,text/csv" @change="handleFileSelect" />
          <span class="muted">Uploads fill the CSV text box below.</span>
        </div>
      </div>

      <div class="field">
        <label>CSV Text</label>
        <textarea v-model="form.csvText" rows="12" placeholder="member_id,first_name,mobile_phone&#10;..." />
      </div>

      <div class="actions">
        <button class="btn" :disabled="isImporting || !form.csvText.trim()" @click="importBatch">
          {{ isImporting ? 'Importing...' : 'Import Batch' }}
        </button>
      </div>

      <div v-if="importMessage" class="surface-note good">
        <p>{{ importMessage }}</p>
      </div>
      <div v-if="importError" class="surface-note bad">
        <p>{{ importError }}</p>
      </div>
    </div>

    <div class="card stack">
      <div class="section-header">
        <div>
          <h2>Selected Batch</h2>
          <p v-if="selectedBatchDetail">Batch-level counts and rejection preview.</p>
          <p v-else>Select a recent batch to inspect import details.</p>
        </div>
      </div>

      <div v-if="selectedBatchDetail" class="stack">
        <div class="grid cols-3">
          <div class="preview-box metric">
            <div>
              <div class="metric-label">Accepted</div>
              <div class="metric-value">{{ acceptedRows(selectedBatchDetail) }}</div>
            </div>
          </div>
          <div class="preview-box metric">
            <div>
              <div class="metric-label">Rejected</div>
              <div class="metric-value">{{ selectedBatchDetail.rejectedRows }}</div>
            </div>
          </div>
          <div class="preview-box metric">
            <div>
              <div class="metric-label">Total Rows</div>
              <div class="metric-value">{{ selectedBatchDetail.totalRows }}</div>
            </div>
          </div>
        </div>

        <table class="table">
          <tbody>
            <tr><td>File</td><td>{{ selectedBatchDetail.fileName }}</td></tr>
            <tr><td>Version</td><td>{{ selectedBatchDetail.mefVersion }}</td></tr>
            <tr><td>Status</td><td><span class="badge good">{{ selectedBatchDetail.status }}</span></td></tr>
            <tr><td>Imported At</td><td>{{ selectedBatchDetail.createdAt }}</td></tr>
            <tr><td>Notes</td><td>{{ selectedBatchDetail.notes ?? 'No notes returned.' }}</td></tr>
          </tbody>
        </table>

        <div v-if="selectedBatchDetail.rejectedPreview?.length" class="preview-box">
          <strong>Rejected Preview</strong>
          <p class="muted">{{ selectedBatchDetail.rejectedPreview.join(' | ') }}</p>
        </div>
      </div>

      <div v-else class="empty-state">
        No MEF batch detail is available yet.
      </div>

      <div v-if="detailError" class="surface-note bad">
        <p>{{ detailError }}</p>
      </div>
    </div>
  </section>

  <section class="card section">
    <div class="section-header">
      <div>
        <h2>Recent Batches</h2>
        <p>Use this list to inspect imported cohorts before building campaigns.</p>
      </div>
      <span v-if="isLoading" class="badge neutral">Loading</span>
    </div>

    <div v-if="batches.length" class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>File</th>
            <th>Version</th>
            <th>Status</th>
            <th>Accepted</th>
            <th>Rejected</th>
            <th>Imported</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="batch in batches" :key="batch.id">
            <td>{{ batch.fileName }}</td>
            <td>{{ batch.mefVersion }}</td>
            <td><span class="badge" :class="batch.status === 'IMPORTED' ? 'good' : 'warn'">{{ batch.status }}</span></td>
            <td>{{ acceptedRows(batch) }}</td>
            <td>{{ batch.rejectedRows }}</td>
            <td>{{ batch.createdAt }}</td>
            <td>
              <button class="btn secondary" @click="loadBatchDetail(String(batch.id))">View Detail</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="empty-state">
      No MEF batches have been returned yet.
    </div>
  </section>
</template>
