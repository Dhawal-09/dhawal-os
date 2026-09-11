import type { CertificateEntry } from './types'

/**
 * `docs/CONTENT.md` does not name any certificates — inventing entries here
 * would violate the "never manufacture content" rule. Left empty until the
 * project owner supplies verified certificate data (see `ASSET_SPEC.md`);
 * `CertificatesPanel` renders an explicit "not yet available" state rather
 * than a fabricated list.
 */
export const certificates: CertificateEntry[] = []

export function validateCertificates(entries: CertificateEntry[]): void {
  const seenIds = new Set<string>()
  for (const entry of entries) {
    if (!entry.id || !entry.title) {
      throw new Error(
        `Certificate entry is missing a required field: ${JSON.stringify(entry)}`,
      )
    }
    if (seenIds.has(entry.id)) {
      throw new Error(`Duplicate certificate id: "${entry.id}"`)
    }
    seenIds.add(entry.id)
  }
}

validateCertificates(certificates)
