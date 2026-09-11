import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { LoadingScreen } from './LoadingScreen'

afterEach(() => {
  cleanup()
})

describe('LoadingScreen', () => {
  it('announces an honest, indeterminate status (no fabricated percentage)', () => {
    render(<LoadingScreen />)

    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('INITIALIZING DHAWAL.OS')
    expect(status.textContent).not.toMatch(/%/)
  })
})
