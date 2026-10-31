import { NavLink, Route, Routes } from 'react-router-dom'
import NotFoundPage from '@/routes/NotFoundPage'
import StagesPage from '@/routes/StagesPage'

export default function App() {
  return (
    <>
      <nav aria-label="Navigation principale">
        <NavLink to="/stages">Étapes</NavLink>
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<StagesPage />} />
          <Route path="/stages" element={<StagesPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </>
  )
}
