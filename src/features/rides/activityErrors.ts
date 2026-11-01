/** Fichier lisible mais volontairement ignoré (autre sport, pas de trace GPS…). */
export class SkippedActivity extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SkippedActivity'
  }
}
