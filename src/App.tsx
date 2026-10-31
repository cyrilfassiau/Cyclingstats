import { Navigate, NavLink, Route, Routes } from 'react-router-dom'
import GcPage from '@/features/gc/GcPage'
import StageDetailPage from '@/features/stages/StageDetailPage'
import StagesPage from '@/features/stages/StagesPage'
import NotFoundPage from '@/routes/NotFoundPage'

export default function App() {
  return (
    <>
      <header className="app-header">
        <p className="brand">Cyclingstats · Tour de France 2026</p>
        <nav aria-label="Navigation principale">
          <NavLink to="/stages">Étapes</NavLink>
          <NavLink to="/gc">Classement général</NavLink>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/stages" replace />} />
          <Route path="/stages" element={<StagesPage />} />
          <Route path="/stages/:id" element={<StageDetailPage />} />
          <Route path="/gc" element={<GcPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </>
  )
}
