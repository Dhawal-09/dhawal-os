import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the foundation placeholder shell', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: /dhawal\.os/i }),
    ).toBeInTheDocument()
  })
})
