import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { gameEventBridge } from '../../game/events/GameEventBridge'
import { JOYSTICK_DEAD_ZONE } from '../../game/input/joystickMath'
import { touchInput } from '../../game/input/TouchInput'
import { MobileControls } from './MobileControls'

afterEach(() => {
  cleanup()
  touchInput.reset()
  vi.restoreAllMocks()
})

/** A 100×100 base at the page origin: center (50, 50), knob travel 50 × (1 − 0.4) = 30px. */
const CENTER = 50
const TRAVEL = 30

function joystick(): HTMLElement {
  const stick = screen.getByRole('group', { name: 'Movement joystick' })
  vi.spyOn(stick, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    top: 0,
    right: 100,
    bottom: 100,
    width: 100,
    height: 100,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  })
  return stick
}

function knob(stick: HTMLElement): HTMLElement {
  return stick.querySelector<HTMLElement>('.mobile-stick-knob')!
}

/** The stick's raw (unsmoothed) vector. */
function held(): { x: number; y: number } {
  return touchInput.getMovementVector()
}

function at(offsetX: number, offsetY: number, pointerId = 1) {
  return { pointerId, clientX: CENTER + offsetX, clientY: CENTER + offsetY }
}

describe('MobileControls', () => {
  it('renders the movement joystick and the interact button — and no arrow buttons', () => {
    render(<MobileControls />)

    expect(
      screen.getByRole('group', { name: 'Movement joystick' }),
    ).toBeInTheDocument()
    const interact = screen.getByRole('button', { name: 'Interact' })
    expect(interact).toHaveTextContent('E')
    expect(interact).toHaveTextContent('INTERACT')
    expect(screen.queryByRole('button', { name: /^move /i })).toBeNull()
  })

  it('pressing at the edge holds a full-strength vector in that direction until release', () => {
    render(<MobileControls />)
    const stick = joystick()

    fireEvent.pointerDown(stick, at(TRAVEL, 0))
    expect(held().x).toBeCloseTo(1)
    expect(held().y).toBeCloseTo(0)
    expect(stick).toHaveClass('is-active')

    fireEvent.pointerUp(stick, at(TRAVEL, 0))
    expect(held()).toEqual({ x: 0, y: 0 })
    expect(stick).not.toHaveClass('is-active')
  })

  it('dragging changes direction continuously — a diagonal is a real diagonal', () => {
    render(<MobileControls />)
    const stick = joystick()

    fireEvent.pointerDown(stick, at(0, -TRAVEL))
    expect(held().y).toBeCloseTo(-1)

    fireEvent.pointerMove(stick, at(TRAVEL, -TRAVEL))
    expect(held().x).toBeCloseTo(Math.SQRT1_2)
    expect(held().y).toBeCloseTo(-Math.SQRT1_2)

    fireEvent.pointerMove(stick, at(0, TRAVEL))
    expect(held().x).toBeCloseTo(0)
    expect(held().y).toBeCloseTo(1)
  })

  it('a partial push gives a partial magnitude', () => {
    render(<MobileControls />)
    const stick = joystick()

    fireEvent.pointerDown(stick, at(TRAVEL / 2, 0))

    expect(held().x).toBeCloseTo(
      (0.5 - JOYSTICK_DEAD_ZONE) / (1 - JOYSTICK_DEAD_ZONE),
    )
  })

  it('a touch inside the dead zone moves the knob but not the player', () => {
    render(<MobileControls />)
    const stick = joystick()

    fireEvent.pointerDown(stick, at(2, 0))

    expect(held()).toEqual({ x: 0, y: 0 })
    expect(knob(stick).style.transform).toBe('translate(2px, 0px)')
  })

  it('the knob follows the thumb, stays inside the base when dragged beyond it, and returns to center on release', () => {
    render(<MobileControls />)
    const stick = joystick()

    fireEvent.pointerDown(stick, at(10, 5))
    expect(knob(stick).style.transform).toBe('translate(10px, 5px)')

    // Far outside the base, straight right.
    fireEvent.pointerMove(stick, at(400, 0))
    expect(knob(stick).style.transform).toBe(`translate(${TRAVEL}px, 0px)`)
    expect(held().x).toBeCloseTo(1)

    fireEvent.pointerUp(stick, at(400, 0))
    expect(knob(stick).style.transform).toBe('translate(0px, 0px)')
  })

  it('a cancelled pointer releases the stick too', () => {
    render(<MobileControls />)
    const stick = joystick()

    fireEvent.pointerDown(stick, at(-TRAVEL, 0))
    fireEvent.pointerCancel(stick, at(-TRAVEL, 0))

    expect(held()).toEqual({ x: 0, y: 0 })
  })

  it('only the first pointer drives the stick — a second finger neither moves nor releases it', () => {
    render(<MobileControls />)
    const stick = joystick()

    fireEvent.pointerDown(stick, at(TRAVEL, 0, 1))
    fireEvent.pointerDown(stick, at(-TRAVEL, 0, 2))
    fireEvent.pointerMove(stick, at(0, TRAVEL, 2))
    fireEvent.pointerUp(stick, at(0, TRAVEL, 2))

    expect(held().x).toBeCloseTo(1)
    expect(held().y).toBeCloseTo(0)
  })

  it('a pointer moving over the stick without pressing holds nothing', () => {
    render(<MobileControls />)
    const stick = joystick()

    fireEvent.pointerMove(stick, at(TRAVEL, 0))

    expect(held()).toEqual({ x: 0, y: 0 })
  })

  it('the interact button queues exactly one interact press', () => {
    render(<MobileControls />)

    fireEvent.click(screen.getByRole('button', { name: 'Interact' }))

    expect(touchInput.wasInteractPressed()).toBe(true)
    expect(touchInput.wasInteractPressed()).toBe(false)
  })

  it('a panel opening removes the controls and releases the stick at once; closing brings them back at rest', () => {
    render(<MobileControls />)
    fireEvent.pointerDown(joystick(), at(0, TRAVEL))

    act(() => gameEventBridge.emit('OPEN_PROJECTS'))

    expect(
      screen.queryByRole('group', { name: 'Movement joystick' }),
    ).toBeNull()
    expect(screen.queryByRole('button', { name: 'Interact' })).toBeNull()
    // No ease-out either: nothing is left to coast on when the game resumes.
    expect(touchInput.getMovementVector(16)).toEqual({ x: 0, y: 0 })

    act(() => gameEventBridge.emit('RETURN_TO_WORLD'))

    const stick = screen.getByRole('group', { name: 'Movement joystick' })
    expect(stick).not.toHaveClass('is-active')
    expect(held()).toEqual({ x: 0, y: 0 })
  })

  it('a non-panel modal (PAUSE_WORLD) removes the controls as well', () => {
    render(<MobileControls />)

    act(() => gameEventBridge.emit('PAUSE_WORLD'))
    expect(screen.queryByRole('button', { name: 'Interact' })).toBeNull()

    act(() => gameEventBridge.emit('RETURN_TO_WORLD'))
    expect(screen.getByRole('button', { name: 'Interact' })).toBeInTheDocument()
  })

  it('unmounting (leaving GAME) releases the stick', () => {
    const { unmount } = render(<MobileControls />)
    fireEvent.pointerDown(joystick(), at(TRAVEL, 0))

    unmount()

    expect(touchInput.getMovementVector(16)).toEqual({ x: 0, y: 0 })
  })
})
