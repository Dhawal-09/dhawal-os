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
