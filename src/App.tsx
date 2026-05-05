import { HashRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import GameLibrary from './pages/GameLibrary'
import GameSystem from './pages/GameSystem'
import RulesViewer from './pages/RulesViewer'
import RosterList from './pages/RosterList'
import RosterWizard from './pages/RosterWizard'
import RosterView from './pages/RosterView'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="games" element={<GameLibrary />} />
          <Route path="games/:slug" element={<GameSystem />} />
          <Route path="games/:slug/:catalogueId" element={<RulesViewer />} />
          <Route path="rosters" element={<RosterList />} />
          <Route path="rosters/new" element={<RosterWizard />} />
          <Route path="rosters/:id" element={<RosterWizard />} />
          <Route path="rosters/:id/view" element={<RosterView />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
