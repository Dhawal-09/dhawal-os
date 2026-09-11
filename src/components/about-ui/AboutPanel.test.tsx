import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { about } from '../../data/about'
import { AboutPanel } from './AboutPanel'

afterEach(() => {
  cleanup()
})

describe('AboutPanel', () => {
  it('renders the identity from the data file', () => {
    render(<AboutPanel />)

    expect(
      screen.getByRole('heading', { name: about.name }),
    ).toBeInTheDocument()
    expect(screen.getByText(about.title)).toBeInTheDocument()
  })
})
