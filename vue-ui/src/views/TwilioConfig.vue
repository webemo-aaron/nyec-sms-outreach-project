<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { api } from '../api/client'
const saved = ref(false)
const testQueued = ref(false)
const testError = ref('')
const testResult = ref('')
const form = reactive({ mode: 'TEST', accountSid: '', messagingServiceSid: '', callbackBaseUrl: '', sendWindowStart: '09:00', sendWindowEnd: '17:00', maxRetryAttempts: 5, testPhone: '+15555550123' })
onMounted(async () => Object.assign(form, await api.twilioConfig()))
async function save() { await api.saveTwilioConfig(form); saved.value = true }
async function test() {
  testQueued.value = false
  testError.value = ''
  testResult.value = ''
  try {
    const result = await api.sendTwilioTest({ to: form.testPhone, body: 'NYeC outreach test message' })
    testQueued.value = true
    testResult.value = result.sid ? `Test message queued: ${result.sid}` : 'Test message queued'
  } catch (error) {
    testError.value = error instanceof Error ? error.message : 'Unable to send test SMS'
  }
}
</script>

<template>
  <section class="page-title">
    <h1>Twilio Configuration</h1>
    <p>Configure messaging credentials, callback routes, mode, retry policy, and test delivery before live execution.</p>
  </section>
  <section class="grid cols-2 section">
    <div class="card form">
      <h2>Provider Settings</h2>
      <div class="field"><label>Mode</label><select v-model="form.mode"><option>TEST</option><option>LIVE</option></select></div>
      <div class="field"><label>Account SID</label><input v-model="form.accountSid" /></div>
      <div class="field"><label>Messaging Service SID</label><input v-model="form.messagingServiceSid" /></div>
      <div class="field"><label>Callback Base URL</label><input v-model="form.callbackBaseUrl" /></div>
      <div class="actions"><button class="btn" @click="save">Save Configuration</button><button class="btn secondary">Validate Callbacks</button></div>
      <span v-if="saved" class="badge good">Saved</span>
    </div>
    <div class="card form">
      <h2>Execution Policy</h2>
      <div class="field"><label>Send Window Start</label><input v-model="form.sendWindowStart" /></div>
      <div class="field"><label>Send Window End</label><input v-model="form.sendWindowEnd" /></div>
      <div class="field"><label>Max Retry Attempts</label><input type="number" v-model="form.maxRetryAttempts" /></div>
      <div class="field"><label>Test Phone</label><input v-model="form.testPhone" /></div>
      <div class="actions"><button class="btn" @click="test">Send Test SMS</button></div>
      <span v-if="testQueued" class="badge good">{{ testResult }}</span>
      <span v-if="testError" class="badge bad">{{ testError }}</span>
    </div>
  </section>
</template>
