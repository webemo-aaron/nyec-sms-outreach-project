<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { api, demoTwilioConfig, type TwilioConfig } from '../api/client'

const isLoading = ref(true)
const loadSource = ref<'live' | 'demo'>('live')
const loadError = ref('')
const saveMessage = ref('')
const saveError = ref('')
const isSaving = ref(false)
const isSendingTest = ref(false)
const testError = ref('')
const testResult = ref('')

const form = reactive<TwilioConfig & { testPhone: string }>({
  ...demoTwilioConfig,
  fromNumber: '',
  testPhone: '+15005550006'
})

async function loadConfig() {
  isLoading.value = true
  loadError.value = ''

  try {
    Object.assign(form, await api.getTwilioConfig())
    loadSource.value = 'live'
  } catch (error) {
    Object.assign(form, demoTwilioConfig)
    loadSource.value = 'demo'
    loadError.value = error instanceof Error ? error.message : 'Unable to load Twilio configuration.'
  } finally {
    isLoading.value = false
  }
}

async function save() {
  isSaving.value = true
  saveMessage.value = ''
  saveError.value = ''

  try {
    const result = await api.saveTwilioConfig({
      mode: form.mode,
      accountSid: form.accountSid,
      messagingServiceSid: form.messagingServiceSid,
      fromNumber: form.fromNumber,
      callbackBaseUrl: form.callbackBaseUrl,
      sendWindowStart: form.sendWindowStart,
      sendWindowEnd: form.sendWindowEnd,
      maxRetryAttempts: form.maxRetryAttempts,
      status: form.status,
      authTokenSecretRef: form.authTokenSecretRef
    })
    saveMessage.value = result.message ?? `Configuration saved${result.mode ? ` (${result.mode})` : ''}.`
  } catch (error) {
    saveError.value = error instanceof Error ? error.message : 'Unable to save Twilio configuration.'
  } finally {
    isSaving.value = false
  }
}

async function sendTest() {
  isSendingTest.value = true
  testError.value = ''
  testResult.value = ''

  try {
    const result = await api.sendTwilioTest({
      to: form.testPhone,
      body: 'NYeC outreach operational test message'
    })
    testResult.value = result.sid
      ? `Test message queued with ${result.provider}: ${result.sid}`
      : `Test message accepted by ${result.provider}.`
  } catch (error) {
    testError.value = error instanceof Error ? error.message : 'Unable to send test SMS.'
  } finally {
    isSendingTest.value = false
  }
}

onMounted(loadConfig)
</script>

<template>
  <section class="page-title">
    <h1>Twilio Configuration</h1>
    <p>Configure local messaging settings, verify credential status, and run a test SMS before dispatch work.</p>
  </section>

  <section class="section">
    <div v-if="loadSource === 'live'" class="surface-note good">
      <p>Loaded from the Node API. Current provider status: <strong>{{ form.status }}</strong>.</p>
    </div>
    <div v-else class="surface-note warn">
      <p>Showing seeded demo configuration because the API load failed: {{ loadError }}</p>
    </div>
  </section>

  <section class="grid cols-2 section">
    <div class="card form">
      <div class="section-header">
        <div>
          <h2>Provider Settings</h2>
          <p v-if="isLoading">Loading configuration...</p>
          <p v-else>Save mode, routing, and secret reference details for local testing.</p>
        </div>
        <span class="badge" :class="form.status === 'Configured' ? 'good' : 'warn'">{{ form.status }}</span>
      </div>

      <div class="field">
        <label>Mode</label>
        <select v-model="form.mode">
          <option>TEST</option>
          <option>LIVE</option>
        </select>
      </div>

      <div class="field">
        <label>Account SID</label>
        <input v-model="form.accountSid" placeholder="AC..." />
      </div>

      <div class="field">
        <label>Messaging Service SID</label>
        <input v-model="form.messagingServiceSid" placeholder="MG..." />
      </div>

      <div class="field">
        <label>From Number (optional)</label>
        <input v-model="form.fromNumber" placeholder="+15555550123" />
      </div>

      <div class="field">
        <label>Auth Token Secret Ref</label>
        <input v-model="form.authTokenSecretRef" placeholder="vault://twilio/default/auth-token" />
      </div>

      <div class="field">
        <label>Callback Base URL</label>
        <input v-model="form.callbackBaseUrl" placeholder="http://localhost:3001" />
      </div>

      <div class="actions">
        <button class="btn" :disabled="isSaving" @click="save">{{ isSaving ? 'Saving...' : 'Save Configuration' }}</button>
        <button class="btn secondary" :disabled="isLoading" @click="loadConfig">Reload</button>
      </div>

      <div v-if="saveMessage" class="surface-note good">
        <p>{{ saveMessage }}</p>
      </div>
      <div v-if="saveError" class="surface-note bad">
        <p>{{ saveError }}</p>
      </div>
    </div>

    <div class="card form">
      <div class="section-header">
        <div>
          <h2>Execution Policy</h2>
          <p>Use the same window and retry values your dispatch workflow will use.</p>
        </div>
      </div>

      <div class="form-grid">
        <div class="field">
          <label>Send Window Start</label>
          <input v-model="form.sendWindowStart" />
        </div>
        <div class="field">
          <label>Send Window End</label>
          <input v-model="form.sendWindowEnd" />
        </div>
      </div>

      <div class="field">
        <label>Max Retry Attempts</label>
        <input v-model="form.maxRetryAttempts" type="number" min="0" />
      </div>

      <div class="field">
        <label>Test Phone</label>
        <input v-model="form.testPhone" placeholder="+15005550006" />
      </div>

      <div class="actions">
        <button class="btn" :disabled="isSendingTest" @click="sendTest">
          {{ isSendingTest ? 'Sending...' : 'Send Test SMS' }}
        </button>
      </div>

      <div v-if="testResult" class="surface-note good">
        <p>{{ testResult }}</p>
      </div>
      <div v-if="testError" class="surface-note bad">
        <p>{{ testError }}</p>
      </div>
    </div>
  </section>
</template>
