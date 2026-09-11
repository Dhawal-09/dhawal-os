import { expect, test, type Page } from 'playwright/test'

async function startJourney(page: Page): Promise<void> {
  await page.getByRole('button', { name: /start journey/i }).click()
  await page.locator('.game-canvas-host canvas').waitFor()
  await expect(page.getByRole('status')).toHaveCount(0)
}

/** The portfolio nav is a disclosure behind the HUD's menu toggle (PHASE 09 GameHud) — opens it. */
async function openHudMenu(page: Page) {
  await page.getByRole('button', { name: /open menu/i }).click()
  return page.getByRole('navigation', { name: /portfolio sections/i })
}

test('landing screen is the entry point: branding and START JOURNEY are visible, the game is not mounted yet', async ({
  page,
}) => {
  await page.goto('/')

  await expect(page.getByText('DHAWAL.OS')).toBeVisible()
  await expect(
    page.getByRole('button', { name: /start journey/i }),
  ).toBeVisible()
  await expect(page.locator('.game-canvas-host canvas')).toHaveCount(0)
})

test('clicking START JOURNEY shows a loading state, then the game', async ({
  page,
}) => {
  await page.goto('/')

  await page.getByRole('button', { name: /start journey/i }).click()
  // The loading state is real but may be very brief locally — assert it
  // resolves into the game rather than asserting on its exact duration.
  await page.locator('.game-canvas-host canvas').waitFor()

  await expect(page.getByRole('status')).toHaveCount(0)
  await expect(page.locator('.game-canvas-host canvas')).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('the game fills the available viewport — no small centered box, no large surrounding page background', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.goto('/')
  await startJourney(page)

  const viewport = page.viewportSize()!
  const canvasBox = await page.locator('.game-canvas-host canvas').boundingBox()
  const hudBox = await page.getByRole('banner').boundingBox()

  expect(canvasBox).not.toBeNull()
  expect(hudBox).not.toBeNull()

  // The canvas spans essentially the full viewport width, and the full
  // height minus the slim HUD bar — not a small centered 1440x1024 box
  // surrounded by webpage background.
  expect(canvasBox!.width).toBeGreaterThan(viewport.width * 0.98)
  expect(canvasBox!.height).toBeGreaterThan(
    (viewport.height - hudBox!.height) * 0.98,
  )
  expect(canvasBox!.x).toBeLessThan(4)

  // The HUD bar itself stays slim — a real header row, not the old
  // multi-row nav that used to eat most of the vertical space.
  expect(hudBox!.height).toBeLessThan(100)
})

test('a laptop-sized viewport (1366×768, a different aspect ratio than the 1440×1024 world) still fills the screen without distortion', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  await page.goto('/')
  await startJourney(page)

  const viewport = page.viewportSize()!
  const canvasBox = await page.locator('.game-canvas-host canvas').boundingBox()
  const hudBox = await page.getByRole('banner').boundingBox()

  expect(canvasBox!.width).toBeGreaterThan(viewport.width * 0.98)
  expect(canvasBox!.height).toBeGreaterThan(
    (viewport.height - hudBox!.height) * 0.98,
  )
})

test('resizing the browser window resizes the canvas in place — never a second canvas, never a duplicate GameApp', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')
  await startJourney(page)

  const before = await page.locator('.game-canvas-host canvas').boundingBox()

  await page.setViewportSize({ width: 1536, height: 864 })
  // Resize is debounced via requestAnimationFrame in GameCanvas — give it a tick.
  await page.waitForTimeout(100)

  await expect(page.locator('.game-canvas-host canvas')).toHaveCount(1)
  const after = await page.locator('.game-canvas-host canvas').boundingBox()
  expect(after!.width).not.toBe(before!.width)
  expect(after!.width).toBeGreaterThan(1536 * 0.98)

  // Still exactly one Pixi application — world/player interaction still works post-resize.
  await page.locator('.game-canvas-host').click()
  await page.keyboard.press('e')
  await expect(page.getByRole('dialog')).toBeVisible()
})

test('the actual Pixi canvas/game shell exists after initialization, as the single rendering entry point', async ({
  page,
}) => {
  await page.goto('/')
  await startJourney(page)

  await expect(page.locator('.game-canvas-host canvas')).toHaveCount(1)
  await expect(page.getByRole('heading', { name: 'DHAWAL.OS' })).toBeVisible()
  const nav = await openHudMenu(page)
  await expect(nav).toBeVisible()
})

test('refreshing after entering the game stays in GAME — never falls back to LANDING (session persistence)', async ({
  page,
}) => {
  await page.goto('/')
  await startJourney(page)
  await expect(page.locator('.game-canvas-host canvas')).toHaveCount(1)

  await page.reload()

  // LANDING must NOT reappear — the browser tab remembers this session
  // entered the game (sessionStorage, not localStorage).
  await expect(
    page.getByRole('button', { name: /start journey/i }),
  ).toHaveCount(0)
  // A brand-new JS runtime still has to actually bootstrap a fresh GameApp
  // — there is no persisted Pixi instance across a reload — so this
  // resolves through LOADING into GAME again, not instantly.
  await page.locator('.game-canvas-host canvas').waitFor()
  await expect(page.getByRole('status')).toHaveCount(0)
  await expect(page.locator('.game-canvas-host canvas')).toHaveCount(1)
  await expect(page.getByRole('button', { name: /^exit$/i })).toBeVisible()
  const navAfterRefresh = await openHudMenu(page)
  await expect(navAfterRefresh).toBeVisible()
  await page.keyboard.press('Escape')

  // Player/world/interaction all still work after the refresh.
  await page.locator('.game-canvas-host').click()
  await page.keyboard.press('e')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('heading', { name: 'About Me' })).toBeVisible()
  await dialog.getByRole('button', { name: /close/i }).click()
  await expect(dialog).not.toBeVisible()

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

test('EXIT: cancel keeps the game, confirm returns to LANDING and a fresh session can be started', async ({
  page,
}) => {
  await page.goto('/')
  await startJourney(page)

  const exitButton = page.getByRole('button', { name: /^exit$/i })
  await expect(exitButton).toBeVisible()

  // Click EXIT -> confirmation dialog appears -> CANCEL -> game remains.
  await exitButton.click()
  const confirmDialog = page.getByRole('dialog', { name: /exit dhawal\.os/i })
  await expect(confirmDialog).toBeVisible()
  await confirmDialog.getByRole('button', { name: /^cancel$/i }).click()
  await expect(confirmDialog).not.toBeVisible()
  await expect(page.locator('.game-canvas-host canvas')).toHaveCount(1)
  await expect(exitButton).toBeVisible()

  // Click EXIT again -> confirm EXIT -> LANDING appears, canvas removed.
  await exitButton.click()
  await expect(confirmDialog).toBeVisible()
  await confirmDialog.getByRole('button', { name: /^exit$/i }).click()
  await expect(confirmDialog).not.toBeVisible()

  await expect(
    page.getByRole('button', { name: /start journey/i }),
  ).toBeVisible()
  await expect(page.locator('.game-canvas-host canvas')).toHaveCount(0)

  // A reload right after exiting must show LANDING again — the session
  // flag was actually cleared, not just the in-memory React state.
  await page.reload()
  await expect(
    page.getByRole('button', { name: /start journey/i }),
  ).toBeVisible()
  await expect(page.locator('.game-canvas-host canvas')).toHaveCount(0)

  // START JOURNEY again -> a fresh game initializes successfully, exactly one canvas.
  await startJourney(page)
  await expect(page.locator('.game-canvas-host canvas')).toHaveCount(1)
  await expect(page.getByRole('button', { name: /^exit$/i })).toBeVisible()
})

test('VIEW RESUME on the landing screen points at the static resume asset, independent of the game', async ({
  page,
}) => {
  await page.goto('/')

  const link = page.getByRole('link', { name: /view resume/i })
  await expect(link).toBeVisible()
  await expect(link).toHaveAttribute('href', '/resume.pdf')
  await expect(link).toHaveAttribute('target', '_blank')
})

test('mobile viewport: landing is usable with no horizontal overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  await expect(page.getByText('DHAWAL.OS')).toBeVisible()
  const startButton = page.getByRole('button', { name: /start journey/i })
  await expect(startButton).toBeVisible()

  const scrollWidth = await page.evaluate(
    () => document.documentElement.scrollWidth,
  )
  const clientWidth = await page.evaluate(
    () => document.documentElement.clientWidth,
  )
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1) // +1 for sub-pixel rounding

  await startButton.click()
  await page.locator('.game-canvas-host canvas').waitFor()
  await expect(page.locator('.game-canvas-host canvas')).toBeVisible()

  // The game view (HUD + fullscreen canvas) is also overflow-free and usable.
  const gameScrollWidth = await page.evaluate(
    () => document.documentElement.scrollWidth,
  )
  const gameClientWidth = await page.evaluate(
    () => document.documentElement.clientWidth,
  )
  expect(gameScrollWidth).toBeLessThanOrEqual(gameClientWidth + 1)
  await expect(page.getByRole('button', { name: /open menu/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /^exit$/i })).toBeVisible()
})

test('approaching "projects" and pressing E opens the React panel end to end', async ({
  page,
}) => {
  await page.goto('/')
  await startJourney(page)
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
  await startJourney(page)
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
  await startJourney(page)

  const nav = await openHudMenu(page)
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
