import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { CertificatesPanel } from './CertificatesPanel'

afterEach(() => {
  cleanup()
})

describe('CertificatesPanel', () => {
  it('renders an explicit pending state rather than fabricated certificates', () => {
    render(<CertificatesPanel />)

    expect(screen.getByText(/not yet available/i)).toBeInTheDocument()
  })
})
