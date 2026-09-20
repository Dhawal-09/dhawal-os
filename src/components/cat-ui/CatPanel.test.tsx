import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { cat } from '../../data/cat'
import { CatPanel } from './CatPanel'

afterEach(() => {
  cleanup()
})

describe('CatPanel', () => {
  it('renders the cat flavor text from the data file', () => {
    render(<CatPanel />)

    expect(
      screen.getByRole('heading', { name: cat.name }),
    ).toBeInTheDocument()
    expect(screen.getByText(cat.title)).toBeInTheDocument()
  })
})
