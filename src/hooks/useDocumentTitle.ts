import { useEffect } from 'react'

/** Titre de l'onglet par page : c'est aussi ce que les lecteurs d'écran annoncent en premier. */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · Cyclingstats`
  }, [title])
}
