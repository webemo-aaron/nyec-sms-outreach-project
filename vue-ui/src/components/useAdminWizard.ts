import { ref } from 'vue'
import type { WizardKey } from './wizardFlows'

const activeWizard = ref<WizardKey | null>(null)

export function useAdminWizard() {
  function openWizard(key: WizardKey) {
    activeWizard.value = key
  }

  function closeWizard() {
    activeWizard.value = null
  }

  return {
    activeWizard,
    openWizard,
    closeWizard
  }
}
