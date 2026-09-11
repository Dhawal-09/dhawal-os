import { expect, test } from 'playwright/test'

test('app shell loads and renders the foundation placeholder', async ({
  page,
}) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: /dhawal\.os/i })).toBeVisible()
})

test('Pixi canvas mounts inside the React tree without the WebGL fallback', async ({
  page,
}) => {
  await page.goto('/')

  await expect(page.locator('.game-canvas-host canvas')).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('approaching "projects" and pressing E opens the React panel end to end', async ({
  page,
}) => {
  await page.goto('/')
  await page.locator('.game-canvas-host canvas').waitFor()
  await page.locator('.game-canvas-host').click() // focus the page for keyboard input

  // Walk from the world center toward the "projects" placeholder.
  await page.keyboard.down('w')
  await page.waitForTimeout(1300)
  await page.keyboard.up('w')
  await page.keyboard.down('a')
  await page.waitForTimeout(2200)
  await page.keyboard.up('a')

  await page.keyboard.press('e')

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(
    dialog.getByRole('heading', { name: 'Projects', exact: true }),
  ).toBeVisible()

  await dialog.getByRole('button', { name: /close/i }).click()
  await expect(dialog).not.toBeVisible()
})

test('closing a panel returns to the live world, and a second interaction opens a different panel', async ({
  page,
}) => {
  await page.goto('/')
  await page.locator('.game-canvas-host canvas').waitFor()
  await page.locator('.game-canvas-host').click()

  // The player spawns at the world center, which is also "About Me"'s
  // position — pressing E immediately opens it, with no walking required.
  await page.keyboard.press('e')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('heading', { name: 'About Me' })).toBeVisible()

  // Pressing E again while the panel is open must not do anything to the
  // world underneath it (INTERACTION_SPEC.md / ACCESSIBILITY.md — keyboard
  // input intended for the panel must not control the player).
  await page.keyboard.press('e')
  await expect(dialog.getByRole('heading', { name: 'About Me' })).toBeVisible()

  await dialog.getByRole('button', { name: /close/i }).click()
  await expect(dialog).not.toBeVisible()

  // World state persisted (same GameApp/GameScene, not recreated) — the
  // player can still walk from where it was. Walk away from "About Me"
  // toward "projects".
  await page.keyboard.down('w')
  await page.waitForTimeout(1300)
  await page.keyboard.up('w')
  await page.keyboard.down('a')
  await page.waitForTimeout(2200)
  await page.keyboard.up('a')

  await page.keyboard.press('e')
  await expect(dialog).toBeVisible()
  await expect(
    dialog.getByRole('heading', { name: 'Projects', exact: true }),
  ).toBeVisible()

  await dialog.getByRole('button', { name: /close/i }).click()
  await expect(dialog).not.toBeVisible()
})

test('every portfolio section is reachable via conventional keyboard navigation, without touching the game', async ({
  page,
}) => {
  await page.goto('/')

  const nav = page.getByRole('navigation', { name: /portfolio sections/i })
  await expect(nav).toBeVisible()

  await nav.getByRole('button', { name: 'Resume' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('heading', { name: 'Resume' })).toBeVisible()
  await expect(dialog.getByRole('link', { name: /resume/i })).toHaveAttribute(
    'href',
    '/resume.pdf',
  )

  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
})
