import { useEffect } from 'react'
import { usePreferences, type Theme } from '@/store/preferences'

const THEMES: Record<Theme, string> = { system: 'Système', light: 'Clair', dark: 'Sombre' }

export function ThemeSelect() {
  const theme = usePreferences((s) => s.theme)
  const setTheme = usePreferences((s) => s.setTheme)

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') delete root.dataset.theme
    else root.dataset.theme = theme
  }, [theme])

  return (
    <label className="theme-select">
      <span className="visually-hidden">Thème</span>
      <select value={theme} onChange={(e) => setTheme(e.target.value as Theme)}>
        {Object.entries(THEMES).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  )
}
