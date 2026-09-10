import { expect, test } from 'playwright/test'

test('app shell loads and renders the foundation placeholder', async ({
  page,
}) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: /dhawal\.os/i })).toBeVisible()
})
