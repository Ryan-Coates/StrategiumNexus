import { HashRouter, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from './store/authStore'
import Layout from './components/Layout'
import Home from './pages/Home'
import GameLibrary from './pages/GameLibrary'
import GameSystem from './pages/GameSystem'
import RulesViewer from './pages/RulesViewer'
import RosterList from './pages/RosterList'
import RosterWizard from './pages/RosterWizard'
import RosterView from './pages/RosterView'
import HordeHome from './pages/Horde/HordeHome'
import WaveGenerator from './pages/Horde/WaveGenerator'
import AttritionTracker from './pages/Horde/AttritionTracker'
import CampaignHome from './pages/Campaign/CampaignHome'
import CampaignRosterEditor from './pages/Campaign/CampaignRosterEditor'
import CampaignMission from './pages/Campaign/CampaignMission'
import CampaignTidesHome from './pages/Campaign/CampaignTidesHome'
import CampaignAdmin from './pages/Campaign/CampaignAdmin'
import EntryGate from './components/EntryGate'
import NarrativeList from './pages/Narrative/NarrativeList'
import NarrativeView from './pages/Narrative/NarrativeView'
import NarrativeAdminList from './pages/Narrative/NarrativeAdminList'
import NarrativeEditor from './pages/Narrative/NarrativeEditor'

export default function App() {
  useEffect(() => {
    useAuthStore.getState().init()
  }, [])

  return (
    <HashRouter>
      <Routes>
        <Route element={<EntryGate />}>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="games" element={<GameLibrary />} />
            <Route path="games/:slug" element={<GameSystem />} />
            <Route path="games/:slug/:catalogueId" element={<RulesViewer />} />
            <Route path="rosters" element={<RosterList />} />
            <Route path="rosters/new" element={<RosterWizard />} />
            <Route path="rosters/:id" element={<RosterWizard />} />
            <Route path="rosters/:id/view" element={<RosterView />} />
            <Route path="horde" element={<HordeHome />} />
            <Route path="horde/waves" element={<WaveGenerator />} />
            <Route path="horde/attrition" element={<AttritionTracker />} />
            <Route path="campaign" element={<CampaignTidesHome />} />
            <Route path="campaign/admin" element={<CampaignAdmin />} />
            <Route path="campaign/rosters" element={<CampaignHome />} />
            <Route path="campaign/rosters/:rosterId" element={<CampaignRosterEditor />} />
            <Route path="campaign/rosters/:rosterId/mission" element={<CampaignMission />} />
            <Route path="narrative" element={<NarrativeList />} />
            <Route path="narrative/new" element={<NarrativeEditor />} />
            <Route path="narrative/admin" element={<NarrativeAdminList />} />
            <Route path="narrative/:missionId" element={<NarrativeView />} />
            <Route path="narrative/:missionId/admin" element={<NarrativeEditor />} />
          </Route>
        </Route>
      </Routes>
    </HashRouter>
  )
}
