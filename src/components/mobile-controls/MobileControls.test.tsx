import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { gameEventBridge } from '../../game/events/GameEventBridge'
import { touchInput } from '../../game/input/TouchInput'
import { MobileControls } from './MobileControls'

afterEach(() => {
  cleanup()
  touchInput.reset()
})

function button(name: string): HTMLElement {
  return screen.getByRole('button', { name })
}

describe('MobileControls', () => {
  it('renders a labelled button per direction plus the interact button', () => {
    render(<MobileControls />)

    for (const name of [
      'Move up',
      'Move down',
      'Move left',
      'Move right',
      'Interact',
    ]) {
      expect(button(name)).toBeInTheDocument()
    }
    expect(button('Interact')).toHaveTextContent('E')
    expect(button('Interact')).toHaveTextContent('INTERACT')
  })

  it('holding a direction holds it on the shared touch input until release', () => {
    render(<MobileControls />)

    fireEvent.pointerDown(button('Move up'), { pointerId: 1 })
    expect(touchInput.isHeld('up')).toBe(true)
    expect(button('Move up')).toHaveClass('is-held')

    fireEvent.pointerUp(button('Move up'), { pointerId: 1 })
    expect(touchInput.isHeld('up')).toBe(false)
    expect(button('Move up')).not.toHaveClass('is-held')
  })

  it('a cancelled pointer releases its direction too', () => {
    render(<MobileControls />)

    fireEvent.pointerDown(button('Move left'), { pointerId: 1 })
    fireEvent.pointerCancel(button('Move left'), { pointerId: 1 })

    expect(touchInput.isHeld('left')).toBe(false)
  })

  it('two pointers hold two directions at once, released independently', () => {
    render(<MobileControls />)

    fireEvent.pointerDown(button('Move up'), { pointerId: 1 })
    fireEvent.pointerDown(button('Move right'), { pointerId: 2 })
    expect(touchInput.isHeld('up')).toBe(true)
    expect(touchInput.isHeld('right')).toBe(true)

    fireEvent.pointerUp(button('Move up'), { pointerId: 1 })
    expect(touchInput.isHeld('up')).toBe(false)
    expect(touchInput.isHeld('right')).toBe(true)
  })

  it('a pointer moving over the pad without pressing holds nothing', () => {
    render(<MobileControls />)

    fireEvent.pointerMove(button('Move down'), { pointerId: 1 })

    expect(touchInput.isHeld('down')).toBe(false)
  })

  it('the interact button queues exactly one interact press', () => {
    render(<MobileControls />)

    fireEvent.click(button('Interact'))

    expect(touchInput.wasInteractPressed()).toBe(true)
    expect(touchInput.wasInteractPressed()).toBe(false)
  })

  it('a panel opening removes the controls and releases what was held; closing brings them back', () => {
    render(<MobileControls />)
    fireEvent.pointerDown(button('Move down'), { pointerId: 1 })

    act(() => gameEventBridge.emit('OPEN_PROJECTS'))

    expect(screen.queryByRole('button', { name: 'Move down' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Interact' })).toBeNull()
    expect(touchInput.isHeld('down')).toBe(false)

    act(() => gameEventBridge.emit('RETURN_TO_WORLD'))

    expect(button('Move down')).toBeInTheDocument()
    expect(button('Move down')).not.toHaveClass('is-held')
    expect(touchInput.isHeld('down')).toBe(false)
  })

  it('a non-panel modal (PAUSE_WORLD) removes the controls as well', () => {
    render(<MobileControls />)

    act(() => gameEventBridge.emit('PAUSE_WORLD'))
    expect(screen.queryByRole('button', { name: 'Interact' })).toBeNull()

    act(() => gameEventBridge.emit('RETURN_TO_WORLD'))
    expect(button('Interact')).toBeInTheDocument()
  })

  it('unmounting (leaving GAME) releases held directions', () => {
    const { unmount } = render(<MobileControls />)
    fireEvent.pointerDown(button('Move right'), { pointerId: 1 })

    unmount()

    expect(touchInput.isHeld('right')).toBe(false)
  })
})
