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
  await expect(dialog.getByRole('heading', { name: 'Projects' })).toBeVisible()

  await dialog.getByRole('button', { name: /close/i }).click()
  await expect(dialog).not.toBeVisible()
})
