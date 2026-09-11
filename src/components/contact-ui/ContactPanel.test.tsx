import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ContactPanel } from './ContactPanel'

afterEach(() => {
  cleanup()
})

describe('ContactPanel', () => {
  it('renders an explicit pending state rather than a fabricated address or link', () => {
    render(<ContactPanel />)

    expect(screen.getByText(/not yet available/i)).toBeInTheDocument()
  })
})
