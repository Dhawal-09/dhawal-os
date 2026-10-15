import { useEffect, useState } from 'react'

export type ResumeStatus = 'checking' | 'available' | 'unavailable'

/**
 * Whether the resume PDF is actually being served. A plain `ok` isn't
 * enough: an SPA fallback (Vite preview, a Vercel rewrite) answers a
 * missing file with `index.html` and a 200, which a download link would
 * then save as a "PDF". So an HTML response counts as missing too.
 */
export async function isResumeAvailable(
  url: string,
  signal?: AbortSignal,
): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD', signal })
    const contentType = response.headers.get('content-type') ?? ''
    return response.ok && !contentType.includes('text/html')
  } catch {
    return false
  }
}

/** Checks the PDF once per mount; the request is aborted on unmount. */
export function useResumeAvailability(url: string): ResumeStatus {
  const [status, setStatus] = useState<ResumeStatus>('checking')

  useEffect(() => {
    const controller = new AbortController()
    void isResumeAvailable(url, controller.signal).then((available) => {
      if (!controller.signal.aborted) {
        setStatus(available ? 'available' : 'unavailable')
      }
    })
    return () => controller.abort()
  }, [url])

  return status
}

/**
 * Whether the browser can render a PDF inline. `pdfViewerEnabled` is false
 * on e.g. Chrome for Android, where an embedded PDF shows nothing at all;
 * browsers that predate the property are given the benefit of the doubt.
 */
export function canPreviewPdfInline(): boolean {
  return (
    typeof navigator === 'undefined' || navigator.pdfViewerEnabled !== false
  )
}
