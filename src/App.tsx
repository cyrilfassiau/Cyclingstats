import { lazy, Suspense } from 'react'
import { Link, Navigate, NavLink, Route, Routes } from 'react-router-dom'
import { EditionBanner, SiteFooter } from '@/components/SiteChrome'
import { ThemeSelect } from '@/components/ThemeSelect'
import ComparePage from '@/features/compare/ComparePage'
import DashboardPage from '@/features/dashboard/DashboardPage'
import FavoritesPage from '@/features/favorites/FavoritesPage'
import GcPage from '@/features/gc/GcPage'
import RidersPage from '@/features/riders/RidersPage'
import StageDetailPage from '@/features/stages/StageDetailPage'
import StagesPage from '@/features/stages/StagesPage'
import NotFoundPage from '@/routes/NotFoundPage'
import { usePreferences } from '@/store/preferences'

// Pages des sorties chargées à la demande : Leaflet et le parsing GPX restent hors du bundle initial.
const RidesPage = lazy(() => import('@/features/rides/RidesPage'))
const RideDetailPage = lazy(() => import('@/features/rides/RideDetailPage'))

function Count({ value }: { value: number }) {
  return value > 0 ? <span className="count">{value}</span> : null
}

export default function App() {
  const comparedCount = usePreferences((s) => s.compared.length)
  const favoritesCount = usePreferences((s) => s.favorites.length)

  return (
    <>
      <header className="app-header">
        <div className="header-inner">
          <Link to="/" className="brand" aria-label="Cyclingstats, accueil">
            <span className="brand-mark" aria-hidden="true">
              CS
            </span>
            <span className="brand-word">Cyclingstats</span>
          </Link>
          <nav aria-label="Navigation principale">
            <NavLink to="/stages">Étapes</NavLink>
            <NavLink to="/gc">Classement</NavLink>
            <NavLink to="/riders">Coureurs</NavLink>
            <NavLink to="/dashboard">Analyse</NavLink>
            <NavLink to="/compare">
              Comparateur <Count value={comparedCount} />
            </NavLink>
            <NavLink to="/favorites">
              Favoris <Count value={favoritesCount} />
            </NavLink>
            <NavLink to="/rides">Mes sorties</NavLink>
          </nav>
          <ThemeSelect />
        </div>
      </header>
      <EditionBanner />
      <main>
        <Suspense fallback={<p aria-busy="true">Chargement…</p>}>
          <Routes>
            <Route path="/" element={<Navigate to="/stages" replace />} />
            <Route path="/stages" element={<StagesPage />} />
            <Route path="/stages/:id" element={<StageDetailPage />} />
            <Route path="/gc" element={<GcPage />} />
            <Route path="/riders" element={<RidersPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/rides" element={<RidesPage />} />
            <Route path="/rides/:id" element={<RideDetailPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>
      <SiteFooter />
    </>
  )
}
