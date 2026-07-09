<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import {
  acceptedRows,
  api,
  demoCampaigns,
  demoMefBatches,
  demoTwilioConfig,
  facilityName,
  type CampaignSummary,
  type CreateCampaignInput,
  type MefBatchSummary,
  type TwilioConfig
} from '../api/client'
import { useAdminWizard } from './useAdminWizard'
import { wizardFlows, wizardSubmitLabels, wizardTitles, type WizardKey } from './wizardFlows'

const { activeWizard, closeWizard } = useAdminWizard()

const stepIndex = ref(0)
const isLoading = ref(false)
const dirty = ref(false)
const errorMessage = ref('')
const resultMessage = ref('')
const batches = ref<MefBatchSummary[]>(demoMefBatches)
const campaigns = ref<CampaignSummary[]>(demoCampaigns)

const cohortForm = reactive({
  fileName: 'NYeC_MEF_2026_07_13.csv',
  mefVersion: '2026-W29',
  csvText: ''
})

const campaignForm = reactive<CreateCampaignInput>({
  name: '1115 Waiver Outreach - Wave 2',
  customerName: 'NYC Health Partner',
  facilityName: 'NYC Health Center A',
  facilityCode: 'NYC-A',
  npiLocation: '1234567890',
  mefBatchId: demoMefBatches[0]?.id ?? 12,
  dailyLimit: 50,
  startDate: '2026-07-13',
  startTime: '09:00',
  externalSurveyBaseUrl: 'https://outreach.example.org/register',
  smsBody:
    'Hello {{FirstName}}, please complete the NYeC outreach questionnaire: {{SurveyLink}}. Reply STOP to opt out.'
})

const selectedDispatchCampaignId = ref<string>(String(demoCampaigns.find((campaign) => campaign.status === 'RUNNING')?.id ?? demoCampaigns[0]?.id ?? ''))

const twilioForm = reactive<TwilioConfig & { testPhone: string; testBody: string }>({
  ...demoTwilioConfig,
  testPhone: '+15005550006',
  testBody: 'NYeC outreach operational test message'
})

const resetConfirmation = ref('')

const flow = computed(() => (activeWizard.value ? wizardFlows[activeWizard.value] : []))
const title = computed(() => (activeWizard.value ? wizardTitles[activeWizard.value] : ''))
const submitLabel = computed(() => (activeWizard.value ? wizardSubmitLabels[activeWizard.value] : 'Submit'))
const currentStep = computed(() => flow.value[stepIndex.value])
const isResultStep = computed(() => currentStep.value?.id === 'result')
const isSubmitStep = computed(() => {
  const id = currentStep.value?.id
  return id === 'review' || id === 'confirm' || id === 'send' || id === 'confirmation'
})

const selectedBatch = computed(() => batches.value.find((batch) => String(batch.id) === String(campaignForm.mefBatchId)))
const selectedDispatchCampaign = computed(() =>
  campaigns.value.find((campaign) => String(campaign.id) === String(selectedDispatchCampaignId.value))
)
const dispatchEligibleCount = computed(() => {
  const campaign = selectedDispatchCampaign.value
  if (!campaign) return 0
  return Math.max(0, Math.min(campaign.remaining, campaign.dailyLimit))
})
const campaignMessagePreview = computed(() =>
  campaignForm.smsBody
    .replace('{{FirstName}}', 'Maria')
    .replace('{{SurveyLink}}', `${campaignForm.externalSurveyBaseUrl ?? 'https://outreach.example.org/register'}?t=secure-token`)
)

watch(activeWizard, async (key) => {
  stepIndex.value = 0
  dirty.value = false
  errorMessage.value = ''
  resultMessage.value = ''
  resetConfirmation.value = ''

  if (key) {
    await loadReferenceData(key)
  }
})

async function loadReferenceData(key: WizardKey) {
  if (key === 'campaign' || key === 'cohortImport') {
    try {
      batches.value = await api.listMefBatches()
      if (batches.value[0] && !batches.value.some((batch) => String(batch.id) === String(campaignForm.mefBatchId))) {
        campaignForm.mefBatchId = batches.value[0].id
      }
    } catch {
      batches.value = demoMefBatches
    }
  }

  if (key === 'dispatch') {
    try {
      campaigns.value = await api.listCampaigns()
    } catch {
      campaigns.value = demoCampaigns
    }
    selectedDispatchCampaignId.value = String(campaigns.value.find((campaign) => campaign.status === 'RUNNING')?.id ?? campaigns.value[0]?.id ?? '')
  }

  if (key === 'twilioTest') {
    try {
      Object.assign(twilioForm, await api.getTwilioConfig())
    } catch {
      Object.assign(twilioForm, demoTwilioConfig)
    }
  }
}

function markDirty() {
  dirty.value = true
}

function requestClose() {
  if (dirty.value && !isResultStep.value && !window.confirm('Close this wizard and discard unsaved form data?')) return
  closeWizard()
}

function previousStep() {
  errorMessage.value = ''
  stepIndex.value = Math.max(0, stepIndex.value - 1)
}

function nextStep() {
  errorMessage.value = ''
  stepIndex.value = Math.min(flow.value.length - 1, stepIndex.value + 1)
}

async function submit() {
  if (!activeWizard.value) return
  isLoading.value = true
  errorMessage.value = ''
  resultMessage.value = ''

  try {
    if (activeWizard.value === 'cohortImport') {
      const detail = await api.importMefBatch({
        fileName: cohortForm.fileName,
        mefVersion: cohortForm.mefVersion,
        csvText: cohortForm.csvText
      })
      resultMessage.value = `Imported ${acceptedRows(detail)} accepted rows and ${detail.rejectedRows} rejected rows.`
    } else if (activeWizard.value === 'campaign') {
      const result = await api.createCampaign({ ...campaignForm })
      resultMessage.value = `Campaign ${result.name} saved with status ${result.status}.`
    } else if (activeWizard.value === 'dispatch') {
      const id = selectedDispatchCampaign.value?.id
      if (!id) throw new Error('Select a campaign before running dispatch.')
      const result = await api.runCampaignDispatch(id)
      resultMessage.value = `Dispatch ${result.id} returned status ${result.status} for ${result.selected} selected messages.`
    } else if (activeWizard.value === 'twilioTest') {
      const result = await api.sendTwilioTest({
        to: twilioForm.testPhone,
        body: twilioForm.testBody
      })
      resultMessage.value = result.sid
        ? `Test message queued with ${result.provider}: ${result.sid}.`
        : `Test message accepted by ${result.provider}.`
    } else if (activeWizard.value === 'reset') {
      if (resetConfirmation.value !== 'RESET') throw new Error('Type RESET to confirm local data reset.')
      const result = await api.resetLocalData()
      resultMessage.value = result.message ?? result.status
    }

    dirty.value = false
    stepIndex.value = flow.value.length - 1
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to complete this action.'
  } finally {
    isLoading.value = false
  }
}

async function handleCohortFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  cohortForm.fileName = file.name
  cohortForm.csvText = await file.text()
  markDirty()
}
</script>

<template>
  <Teleport to="body">
    <div v-if="activeWizard" class="modal-backdrop" role="presentation">
      <section class="modal-shell" role="dialog" aria-modal="true" :aria-label="title">
        <header class="modal-header">
          <div>
            <h2>{{ title }}</h2>
            <p>Review before submitting.</p>
          </div>
          <button class="icon-btn" type="button" aria-label="Close wizard" @click="requestClose">×</button>
        </header>

        <ol class="stepper">
          <li v-for="(step, index) in flow" :key="step.id" :class="{ active: index === stepIndex, complete: index < stepIndex }">
            <span>{{ index + 1 }}</span>
            {{ step.label }}
          </li>
        </ol>

        <div class="modal-body" @input="markDirty" @change="markDirty">
          <template v-if="activeWizard === 'cohortImport'">
            <div v-if="currentStep.id === 'input'" class="form">
              <div class="field"><label>File Name</label><input v-model="cohortForm.fileName" /></div>
              <div class="field"><label>Cohort Version</label><input v-model="cohortForm.mefVersion" /></div>
              <div class="field"><label>Upload CSV</label><input type="file" accept=".csv,text/csv" @change="handleCohortFile" /></div>
              <div class="field"><label>CSV Text</label><textarea v-model="cohortForm.csvText" rows="9" placeholder="member_id,first_name,mobile_phone&#10;..." /></div>
            </div>
            <div v-else-if="currentStep.id === 'review'" class="stack">
              <div class="preview-box"><strong>Import Review</strong><p>{{ cohortForm.fileName }} · {{ cohortForm.mefVersion }}</p></div>
              <p class="muted">{{ cohortForm.csvText.trim().split(/\r?\n/).filter(Boolean).length }} CSV lines ready.</p>
            </div>
          </template>

          <template v-if="activeWizard === 'campaign'">
            <div v-if="currentStep.id === 'cohort'" class="form">
              <div class="field">
                <label>Cohort</label>
                <select v-model="campaignForm.mefBatchId">
                  <option v-for="batch in batches" :key="batch.id" :value="batch.id">{{ batch.mefVersion }} · {{ acceptedRows(batch) }} accepted · {{ batch.fileName }}</option>
                </select>
              </div>
              <div v-if="selectedBatch" class="preview-box"><strong>Selected Cohort</strong><p>{{ acceptedRows(selectedBatch) }} accepted, {{ selectedBatch.rejectedRows }} rejected.</p></div>
            </div>
            <div v-else-if="currentStep.id === 'settings'" class="form">
              <div class="field"><label>Campaign Name</label><input v-model="campaignForm.name" /></div>
              <div class="form-grid">
                <div class="field"><label>Facility</label><input v-model="campaignForm.facilityName" /></div>
                <div class="field"><label>NPI Location</label><input v-model="campaignForm.npiLocation" /></div>
              </div>
              <div class="form-grid">
                <div class="field"><label>Daily Limit</label><input v-model.number="campaignForm.dailyLimit" type="number" min="1" /></div>
                <div class="field"><label>Start Date</label><input v-model="campaignForm.startDate" type="date" /></div>
              </div>
              <div class="field"><label>Survey Link Base</label><input v-model="campaignForm.externalSurveyBaseUrl" /></div>
            </div>
            <div v-else-if="currentStep.id === 'message'" class="form">
              <div class="field"><label>SMS Body</label><textarea v-model="campaignForm.smsBody" rows="8" /></div>
              <div class="preview-box"><strong>SMS Preview</strong><p>{{ campaignMessagePreview }}</p></div>
            </div>
            <div v-else-if="currentStep.id === 'review'" class="stack">
              <div class="preview-box"><strong>{{ campaignForm.name }}</strong><p>{{ selectedBatch?.mefVersion ?? 'No cohort selected' }} · daily limit {{ campaignForm.dailyLimit }}</p></div>
              <p>{{ campaignMessagePreview }}</p>
            </div>
          </template>

          <template v-if="activeWizard === 'dispatch'">
            <div v-if="currentStep.id === 'campaign'" class="form">
              <div class="field">
                <label>Running Campaign</label>
                <select v-model="selectedDispatchCampaignId">
                  <option v-for="campaign in campaigns" :key="campaign.id" :value="String(campaign.id)">{{ campaign.name }} · {{ campaign.status }}</option>
                </select>
              </div>
            </div>
            <div v-else-if="currentStep.id === 'eligibility'" class="grid cols-3">
              <div class="preview-box metric"><div><div class="metric-label">Eligible</div><div class="metric-value">{{ dispatchEligibleCount }}</div></div></div>
              <div class="preview-box metric"><div><div class="metric-label">Daily Limit</div><div class="metric-value">{{ selectedDispatchCampaign?.dailyLimit ?? 0 }}</div></div></div>
              <div class="preview-box metric"><div><div class="metric-label">Remaining</div><div class="metric-value">{{ selectedDispatchCampaign?.remaining ?? 0 }}</div></div></div>
            </div>
            <div v-else-if="currentStep.id === 'confirm'" class="surface-note warn">
              <p>Run dispatch for {{ selectedDispatchCampaign?.name ?? 'the selected campaign' }} using current eligibility and send limits.</p>
            </div>
          </template>

          <template v-if="activeWizard === 'twilioTest'">
            <div v-if="currentStep.id === 'config'" class="stack">
              <table class="table"><tbody><tr><td>Mode</td><td>{{ twilioForm.mode }}</td></tr><tr><td>Status</td><td>{{ twilioForm.status }}</td></tr><tr><td>From Number</td><td>{{ twilioForm.fromNumber || 'Set in local-api/.env' }}</td></tr><tr><td>Send Window</td><td>{{ twilioForm.sendWindowStart }}-{{ twilioForm.sendWindowEnd }}</td></tr></tbody></table>
            </div>
            <div v-else-if="currentStep.id === 'send'" class="form">
              <div class="field"><label>Test Destination</label><input v-model="twilioForm.testPhone" /></div>
              <div class="field"><label>Test Message</label><textarea v-model="twilioForm.testBody" rows="5" /></div>
              <div class="preview-box"><strong>{{ twilioForm.mode }} test</strong><p>{{ twilioForm.testBody }}</p></div>
            </div>
          </template>

          <template v-if="activeWizard === 'reset'">
            <div v-if="currentStep.id === 'warning'" class="surface-note warn">
              <p>Reset removes local cohorts, campaigns, dispatch batches, outbound messages, and audit events.</p>
            </div>
            <div v-else-if="currentStep.id === 'confirmation'" class="form">
              <div class="field"><label>Type RESET to confirm</label><input v-model="resetConfirmation" /></div>
            </div>
          </template>

          <div v-if="isResultStep" class="surface-note good">
            <p>{{ resultMessage || 'Action completed.' }}</p>
          </div>

          <div v-if="errorMessage" class="surface-note bad">
            <p>{{ errorMessage }}</p>
          </div>
        </div>

        <footer class="modal-footer">
          <button class="btn secondary" type="button" @click="requestClose">{{ isResultStep ? 'Close' : 'Cancel' }}</button>
          <button v-if="stepIndex > 0 && !isResultStep" class="btn secondary" type="button" :disabled="isLoading" @click="previousStep">Previous</button>
          <button v-if="!isResultStep && !isSubmitStep" class="btn" type="button" @click="nextStep">Next</button>
          <button v-if="!isResultStep && isSubmitStep" class="btn" :class="{ danger: activeWizard === 'reset' }" type="button" :disabled="isLoading" @click="submit">
            {{ isLoading ? 'Working...' : submitLabel }}
          </button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>
