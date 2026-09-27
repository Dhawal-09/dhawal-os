import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CameraMode } from '../../game/world/cameraConstants'
import { ViewSelectScreen } from './ViewSelectScreen'

afterEach(() => {
  cleanup()
})

/** Mirrors App: owns the selected mode and forwards selections. */
function Harness({
  onSelect = () => {},
  onConfirm = () => {},
}: {
  onSelect?: (mode: CameraMode) => void
  onConfirm?: () => void
}) {
  const [selected, setSelected] = useState<CameraMode | null>(null)
  return (
    <ViewSelectScreen
      selected={selected}
      onSelect={(mode) => {
        setSelected(mode)
        onSelect(mode)
      }}
      onConfirm={onConfirm}
    />
  )
}

describe('ViewSelectScreen', () => {
  it('shows both views with their preview images, and nothing selected yet', () => {
    render(<Harness />)

    expect(
      screen.getByRole('heading', { name: /select your view/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('radio', { name: /explore view/i }),
    ).not.toBeChecked()
    expect(screen.getByRole('radio', { name: /overview/i })).not.toBeChecked()

    const sources = Array.from(document.querySelectorAll('img')).map((img) =>
      img.getAttribute('src'),
    )
    expect(sources).toEqual([
      '/assets/opening/view-explore.png',
      '/assets/opening/view-overview.png',
    ])
  })

  it('cannot continue until a view is selected', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<Harness onConfirm={onConfirm} />)

    const enter = screen.getByRole('button', { name: /select a view/i })
    expect(enter).toBeDisabled()
    await user.click(enter)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('selecting a card highlights it (SELECTED marker, not colour alone) without entering; ENTER then confirms', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const onConfirm = vi.fn()
    render(<Harness onSelect={onSelect} onConfirm={onConfirm} />)

    await user.click(screen.getByRole('radio', { name: /overview/i }))
    expect(onSelect).toHaveBeenCalledWith('overview')
    expect(screen.getByRole('radio', { name: /overview/i })).toBeChecked()
    expect(screen.getByText(/▶ selected/i)).toBeInTheDocument()
    expect(onConfirm).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: /enter dhawal\.os/i }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('Enter on a selected card confirms; Escape never skips the selection', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<Harness onConfirm={onConfirm} />)

    await user.keyboard('{Escape}')
    expect(onConfirm).not.toHaveBeenCalled()

    const explore = screen.getByRole('radio', { name: /explore view/i })
    await user.click(explore)
    fireEvent.keyDown(explore, { key: 'Escape' })
    expect(onConfirm).not.toHaveBeenCalled()

    fireEvent.keyDown(explore, { key: 'Enter' })
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('a missing preview image degrades to a labelled frame instead of a broken image', () => {
    render(<Harness />)
    fireEvent.error(document.querySelector('img')!)
    expect(screen.getByText(/preview unavailable/i)).toBeInTheDocument()
  })
})
