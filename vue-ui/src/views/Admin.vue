<template>
  <section class="page-title">
    <h1>Administration</h1>
    <p>Operational configuration for security, customer scope, feature flags, scheduler, audit, and environment controls.</p>
  </section>
  <section class="grid cols-3 section">
    <div class="card"><h2>Security</h2><table class="table"><tbody><tr><td>RBAC</td><td><span class="badge warn">Scaffold</span></td></tr><tr><td>Table Security</td><td><span class="badge warn">Pending Grants</span></td></tr><tr><td>Audit Required</td><td><span class="badge good">Enabled</span></td></tr></tbody></table></div>
    <div class="card"><h2>Scheduler</h2><table class="table"><tbody><tr><td>Run Days</td><td>M-F</td></tr><tr><td>Start Time</td><td>09:00</td></tr><tr><td>Timezone</td><td>America/New_York</td></tr></tbody></table></div>
    <div class="card"><h2>Feature Flags</h2><table class="table"><tbody><tr><td>Twilio Test Mode</td><td><span class="badge good">On</span></td></tr><tr><td>Billing</td><td><span class="badge good">On</span></td></tr><tr><td>Simulator</td><td><span class="badge good">On</span></td></tr></tbody></table></div>
  </section>
  <section class="card section form">
    <h2>Customer / Facility / NPI Scope</h2>
    <div class="grid cols-3">
      <div class="field"><label>Customer</label><input value="NYC Health Partner" /></div>
      <div class="field"><label>Facility</label><input value="NYC Health Center A" /></div>
      <div class="field"><label>NPI Location</label><input value="1234567890" /></div>
    </div>
    <div class="actions"><button class="btn">Save</button><button class="btn secondary">Export Config</button></div>
  </section>
</template>
