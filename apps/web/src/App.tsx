import { Route, Routes } from 'react-router-dom'
import NavBar from './components/NavBar'
import FlagDetailPage from './pages/FlagDetailPage'
import FlagsPage from './pages/FlagsPage'
import GraphPage from './pages/GraphPage'

export default function App() {
  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-100">
      <NavBar />
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<FlagsPage />} />
          <Route path="/flags/:id" element={<FlagDetailPage />} />
          <Route path="/graph" element={<GraphPage />} />
        </Routes>
      </main>
    </div>
  )
}
