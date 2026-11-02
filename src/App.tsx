import { lazy, Suspense, useEffect, useRef } from 'react'
import { Link, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { SiteFooter } from '@/components/SiteChrome'
import StagesPage from '@/features/stages/StagesPage'
import { usePreferences } from '@/store/preferences'

// Étapes (page d'accueil) est dans le bundle initial ; toutes les autres pages sont chargées
// à la demande, ce qui sort Recharts, Leaflet et le parsing GPX du premier téléchargement.
const StageDetailPage = lazy(() => import('@/features/stages/StageDetailPage'))
const GcPage = lazy(() => import('@/features/gc/GcPage'))
const RidersPage = lazy(() => import('@/features/riders/RidersPage'))
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'))
const ComparePage = lazy(() => import('@/features/compare/ComparePage'))
const FavoritesPage = lazy(() => import('@/features/favorites/FavoritesPage'))
const RidesPage = lazy(() => import('@/features/rides/RidesPage'))
const RideDetailPage = lazy(() => import('@/features/rides/RideDetailPage'))
const NotFoundPage = lazy(() => import('@/routes/NotFoundPage'))

/**
 * À chaque changement de page (pas de filtre), remonte en haut et place le focus sur le
 * contenu principal : sans ça, un lecteur d'écran resterait sur le lien cliqué.
 */
function useFocusMainOnNavigation() {
  const { pathname } = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  // On compare au chemin précédent (et non à un drapeau « premier rendu ») : StrictMode
  // rejoue les effets au montage, ce qui volerait le focus dès le chargement.
  const previousPath = useRef(pathname)

  useEffect(() => {
    if (previousPath.current === pathname) return
    previousPath.current = pathname
    window.scrollTo(0, 0)
    mainRef.current?.focus({ preventScroll: true })
  }, [pathname])

  return mainRef
}

function Count({ value }: { value: number }) {
  return value > 0 ? <span className="count">{value}</span> : null
}

export default function App() {
  const comparedCount = usePreferences((s) => s.compared.length)
  const favoritesCount = usePreferences((s) => s.favorites.length)
  const mainRef = useFocusMainOnNavigation()

  return (
    <>
      <a href="#main" className="skip-link">
        Aller au contenu
      </a>
      <header className="app-header">
        <div className="header-inner">
          <Link to="/" className="brand">
            <span className="brand-mark" aria-hidden="true">
              CS
            </span>
            <span className="brand-word">My TDF cyclingstats</span>
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
          
        </div>
        
      </header>
      <main id="main" ref={mainRef} tabIndex={-1}>
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
