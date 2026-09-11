// Picks the active persistence backend for Campaign Mode: Firestore when the user is
// signed in and allowlisted (shared), IndexedDB otherwise (local). Same function
// signatures on both sides, so campaignStore.ts / narrativeStore.ts don't need to care.
import { useAuthStore } from '../store/authStore'
import * as local from './campaignDb'
import * as cloud from './campaignCloud'

function backend() {
  return useAuthStore.getState().mode === 'shared' ? cloud : local
}

export const saveCampaignRoster: typeof local.saveCampaignRoster = (roster) => backend().saveCampaignRoster(roster)
export const getCampaignRoster: typeof local.getCampaignRoster = (id) => backend().getCampaignRoster(id)
export const listCampaignRosters: typeof local.listCampaignRosters = () => backend().listCampaignRosters()
export const deleteCampaignRoster: typeof local.deleteCampaignRoster = (id) => backend().deleteCampaignRoster(id)

export const saveNarrativeMission: typeof local.saveNarrativeMission = (mission) => backend().saveNarrativeMission(mission)
export const getNarrativeMission: typeof local.getNarrativeMission = (id) => backend().getNarrativeMission(id)
export const listNarrativeMissions: typeof local.listNarrativeMissions = () => backend().listNarrativeMissions()
export const deleteNarrativeMission: typeof local.deleteNarrativeMission = (id) => backend().deleteNarrativeMission(id)
