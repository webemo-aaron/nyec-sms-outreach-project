export type WizardKey = 'cohortImport' | 'campaign' | 'dispatch' | 'twilioTest' | 'reset'

export type WizardStep = {
  id: string
  label: string
}

export const wizardFlows: Record<WizardKey, WizardStep[]> = {
  cohortImport: [
    { id: 'input', label: 'Input' },
    { id: 'review', label: 'Review' },
    { id: 'result', label: 'Result' }
  ],
  campaign: [
    { id: 'cohort', label: 'Cohort' },
    { id: 'settings', label: 'Settings' },
    { id: 'message', label: 'Message' },
    { id: 'review', label: 'Review' },
    { id: 'result', label: 'Result' }
  ],
  dispatch: [
    { id: 'campaign', label: 'Campaign' },
    { id: 'eligibility', label: 'Eligibility' },
    { id: 'confirm', label: 'Confirm' },
    { id: 'result', label: 'Result' }
  ],
  twilioTest: [
    { id: 'config', label: 'Config' },
    { id: 'send', label: 'Send' },
    { id: 'result', label: 'Result' }
  ],
  reset: [
    { id: 'warning', label: 'Warning' },
    { id: 'confirmation', label: 'Confirmation' },
    { id: 'result', label: 'Result' }
  ]
}

export const wizardTitles: Record<WizardKey, string> = {
  cohortImport: 'Import Cohort',
  campaign: 'Create Campaign',
  dispatch: 'Run Dispatch',
  twilioTest: 'Send Twilio Test',
  reset: 'Reset Local Data'
}

export const wizardSubmitLabels: Record<WizardKey, string> = {
  cohortImport: 'Import Cohort',
  campaign: 'Save Campaign',
  dispatch: 'Run Dispatch',
  twilioTest: 'Send Test',
  reset: 'Reset Data'
}
