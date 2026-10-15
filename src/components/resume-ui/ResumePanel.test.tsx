import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RESUME_DOWNLOAD_FILENAME, RESUME_PDF_PATH } from '../../data/resume'
import { ResumePanel } from './ResumePanel'

function serve(response: Response | Error) {
  const fetchMock = vi.fn(() =>
    response instanceof Error
      ? Promise.reject(response)
      : Promise.resolve(response),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const pdf = () =>
  new Response(null, { headers: { 'content-type': 'application/pdf' } })

function setPdfViewerEnabled(value: boolean) {
  Object.defineProperty(navigator, 'pdfViewerEnabled', {
    configurable: true,
    value,
  })
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  Reflect.deleteProperty(navigator, 'pdfViewerEnabled')
})

describe('ResumePanel', () => {
  it('downloads the real PDF under a clear filename, without navigating away', async () => {
    serve(pdf())
    render(<ResumePanel />)

    const download = await screen.findByRole('link', {
      name: 'Download Resume',
    })
    expect(download).toHaveAttribute('href', RESUME_PDF_PATH)
    expect(download).toHaveAttribute('download', RESUME_DOWNLOAD_FILENAME)
    expect(download).not.toHaveAttribute('target')
  })

  it('opens the same PDF in a new tab, safely', () => {
    serve(pdf())
    render(<ResumePanel />)

    const open = screen.getByRole('link', { name: 'Open PDF in New Tab' })
    expect(open).toHaveAttribute('href', RESUME_PDF_PATH)
    expect(open).toHaveAttribute('target', '_blank')
    expect(open).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('checks the file with a HEAD request to the shared resume path', () => {
    const fetchMock = serve(pdf())
    render(<ResumePanel />)

    expect(fetchMock).toHaveBeenCalledWith(
      RESUME_PDF_PATH,
      expect.objectContaining({ method: 'HEAD' }),
    )
  })

  it('previews the PDF inline once it is confirmed, kept out of the Tab order', async () => {
    serve(pdf())
    render(<ResumePanel />)

    expect(screen.getByRole('status')).toHaveTextContent(/loading/i)
    const preview = await screen.findByTitle('Resume PDF preview')
    expect(preview.tagName).toBe('IFRAME')
    expect(preview.getAttribute('src')).toMatch(
      new RegExp(`^${RESUME_PDF_PATH}`),
    )
    expect(preview).toHaveAttribute('tabindex', '-1')
  })

  it('falls back to a message, keeping both actions, when the browser cannot show PDFs inline', async () => {
    setPdfViewerEnabled(false)
    serve(pdf())
    render(<ResumePanel />)

    expect(
      await screen.findByText(/can.t show the pdf here/i),
    ).toBeInTheDocument()
    expect(screen.queryByTitle('Resume PDF preview')).not.toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Download Resume' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Open PDF in New Tab' }),
    ).toBeInTheDocument()
  })

  it.each([
    ['the file is missing (404)', () => new Response(null, { status: 404 })],
    [
      'the host answers with its HTML fallback page instead',
      () =>
        new Response('<!doctype html>', {
          headers: { 'content-type': 'text/html; charset=utf-8' },
        }),
    ],
    ['the request fails outright', () => new TypeError('Failed to fetch')],
  ])(
    'explains, and offers no download, when %s',
    async (_case, makeResponse) => {
      serve(makeResponse())
      render(<ResumePanel />)

      expect(await screen.findByRole('alert')).toHaveTextContent(
        /couldn.t be loaded/i,
      )
      expect(screen.queryByRole('link')).not.toBeInTheDocument()
      expect(screen.queryByTitle('Resume PDF preview')).not.toBeInTheDocument()
    },
  )

  it('aborts the availability check on unmount', () => {
    const fetchMock = serve(pdf())
    const { unmount } = render(<ResumePanel />)

    const init = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    const signal = init[1].signal as AbortSignal
    expect(signal.aborted).toBe(false)
    unmount()
    expect(signal.aborted).toBe(true)
  })
})
