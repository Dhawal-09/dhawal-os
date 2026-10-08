import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GamePanel } from './GamePanel'

afterEach(() => {
  cleanup()
})

describe('GamePanel', () => {
  it('is a labelled modal dialog that renders whatever content it is given', () => {
    render(
      <GamePanel title="Education" titleId="t" onClose={vi.fn()}>
        <p>existing content</p>
      </GamePanel>,
    )

    const dialog = screen.getByRole('dialog', { name: 'Education' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveTextContent('existing content')
  })

  it('defaults to MEDIUM and offers SMALL and LARGE as variants of the same frame', () => {
    const { rerender } = render(
      <GamePanel title="A" titleId="t" onClose={vi.fn()}>
        x
      </GamePanel>,
    )
    expect(screen.getByRole('dialog')).toHaveClass('game-panel--medium')

    for (const size of ['small', 'large'] as const) {
      rerender(
        <GamePanel size={size} title="A" titleId="t" onClose={vi.fn()}>
          x
        </GamePanel>,
      )
      expect(screen.getByRole('dialog')).toHaveClass(
        'game-panel',
        `game-panel--${size}`,
      )
    }
  })

  it('closes from a pixel X that carries no visible word — only an accessible name', async () => {
    const onClose = vi.fn()
    render(
      <GamePanel title="A" titleId="t" onClose={onClose}>
        x
      </GamePanel>,
    )

    const close = screen.getByRole('button', { name: 'Close' })
    expect(close).toHaveTextContent('')
    expect(close.querySelector('svg')).not.toBeNull()

    await userEvent.setup().click(close)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows Back only when the content has somewhere to go back to, and an icon only when given one', async () => {
    const onBack = vi.fn()
    const { rerender } = render(
      <GamePanel title="A" titleId="t" onClose={vi.fn()}>
        x
      </GamePanel>,
    )
    expect(screen.queryByRole('button', { name: /back/i })).toBeNull()

    rerender(
      <GamePanel
        title="A"
        titleId="t"
        onClose={vi.fn()}
        onBack={onBack}
        icon={<img alt="section icon" />}
      >
        x
      </GamePanel>,
    )
    expect(screen.getByAltText('section icon')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: /back/i }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })
})
