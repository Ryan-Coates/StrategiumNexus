import { HashRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import GameLibrary from './pages/GameLibrary'
import GameSystem from './pages/GameSystem'
import RulesViewer from './pages/RulesViewer'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="games" element={<GameLibrary />} />
          <Route path="games/:systemId" element={<GameSystem />} />
          <Route path="games/:systemId/:catalogueId" element={<RulesViewer />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
