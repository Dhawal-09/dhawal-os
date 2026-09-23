import type { ReactElement } from 'react'

/**
 * Lets a panel with internal navigation (currently only Projects) replace
 * the shell's default title and show a Back button, while the shell keeps
 * owning the single header/Close/Escape implementation.
 */
export interface PanelHeader {
  title: string
  onBack?: () => void
}

export interface PanelContentProps {
  /** `null` restores the section's default title with no Back button. */
  setHeader: (header: PanelHeader | null) => void
  /**
   * Only used by panels the shell renders in "window" mode (their own
   * title bar instead of the shared header): the section title, the id the
   * dialog's `aria-labelledby` points at, and the shell's close action.
   */
  title: string
  titleId: string
  onClose: () => void
}

export type PanelContent = (props: PanelContentProps) => ReactElement
