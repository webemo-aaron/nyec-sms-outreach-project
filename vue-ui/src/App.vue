<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark"></div>
        <div>
          <div class="brand-title">NYeC SMS OCM</div>
          <div class="brand-subtitle">Campaign Manager</div>
        </div>
      </div>
      <nav class="nav">
        <RouterLink to="/command-center">Command Center</RouterLink>
        <RouterLink to="/mef-intake">Cohorts</RouterLink>
        <RouterLink to="/campaigns">Campaigns</RouterLink>
        <RouterLink to="/dispatches">Send Activity</RouterLink>
        <RouterLink to="/twilio">Twilio</RouterLink>
        <RouterLink to="/billing">Billing</RouterLink>
        <RouterLink to="/admin">Admin</RouterLink>
      </nav>
    </aside>
    <main class="main">
      <div class="topbar">
        <div class="context-pills">
          <span class="pill">Customer: NYC Health Partner</span>
          <span class="pill">Facility: All</span>
          <span class="pill">NPI: All</span>
        </div>
      </div>
      <RouterView />
    </main>
    <AdminWizardModal />
  </div>
</template>

<script setup lang="ts">
import AdminWizardModal from './components/AdminWizardModal.vue'
</script>
