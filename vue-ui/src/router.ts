import { createRouter, createWebHistory } from 'vue-router'
import CommandCenter from './views/CommandCenter.vue'
import MefIntake from './views/MefIntake.vue'
import Campaigns from './views/Campaigns.vue'
import CampaignWizard from './views/CampaignWizard.vue'
import TwilioConfig from './views/TwilioConfig.vue'
import Dispatches from './views/Dispatches.vue'
import Billing from './views/Billing.vue'
import Admin from './views/Admin.vue'

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/command-center' },
    { path: '/command-center', alias: '/dashboard', component: CommandCenter },
    { path: '/mef-intake', alias: '/mef', component: MefIntake },
    { path: '/campaigns', component: Campaigns },
    { path: '/campaigns/new', component: CampaignWizard },
    { path: '/twilio', component: TwilioConfig },
    { path: '/dispatches', component: Dispatches },
    { path: '/billing', component: Billing },
    { path: '/admin', component: Admin }
  ]
})
