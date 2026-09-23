import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { InteractionOverlay } from '../../app/InteractionOverlay'
import { about, characterId } from '../../data/about'
import { gameEventBridge } from '../../game/events/GameEventBridge'

afterEach(() => {
  cleanup()
})

function openAbout() {
  const user = userEvent.setup()
  render(<InteractionOverlay />)
  act(() => {
    gameEventBridge.emit('OPEN_ABOUT')
  })
  return user
}

describe('AboutPanel (Character ID card)', () => {
  it('opens as the About Me dialog showing the CHARACTER ID card', () => {
    openAbout()

    const dialog = screen.getByRole('dialog', { name: 'About Me' })
    expect(within(dialog).getByText('DHAWAL.OS')).toBeInTheDocument()
    expect(within(dialog).getByText('Character ID')).toBeInTheDocument()
    expect(
      within(dialog).getByRole('img', { name: /portrait of dhawal wani/i }),
    ).toBeInTheDocument()
  })

  it('shows name, role, every identity row, id, and status', () => {
    openAbout()

    expect(screen.getByText(about.name)).toBeInTheDocument()
    expect(screen.getByText(about.title)).toBeInTheDocument()
    for (const row of characterId.rows) {
      expect(screen.getByText(row.label)).toBeInTheDocument()
      expect(screen.getByText(row.value)).toBeInTheDocument()
    }
    expect(screen.getByText('24')).toBeInTheDocument()
    expect(screen.getByText(characterId.id)).toBeInTheDocument()
    expect(screen.getByText(characterId.status)).toBeInTheDocument()
  })

  it('the × button closes and returns to the world', async () => {
    const listener = vi.fn()
    const unsubscribe = gameEventBridge.subscribe(listener)
    const user = openAbout()

    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(listener).toHaveBeenCalledWith('RETURN_TO_WORLD')
    unsubscribe()
  })

  it('Escape closes the card', async () => {
    const user = openAbout()

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
