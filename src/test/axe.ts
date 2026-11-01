import axe from 'axe-core'

/**
 * Lance axe-core sur le rendu et échoue en listant les problèmes trouvés.
 * Le contraste des couleurs n'est pas calculable dans jsdom : il est vérifié dans le navigateur.
 */
export async function expectNoAxeViolations(container: Element) {
  const results = await axe.run(container, {
    rules: { region: { enabled: false }, 'color-contrast': { enabled: false } },
  })
  const summary = results.violations.map(
    (v) => `${v.id} : ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`,
  )
  expect(summary).toEqual([])
}
