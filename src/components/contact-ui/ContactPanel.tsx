import type { CSSProperties } from 'react'
import { contactItems } from '../../data/contact'
import type { ContactItem as ContactItemData } from '../../data/types'
import { useIconUrls } from '../panel-icons/iconUrls'
import { ContactItem } from './ContactItem'
import './ContactPanel.css'

/** The icon URL map lives in its own on-demand chunk — see `useIconUrls`. */
const loadIconUrls = () =>
  import('./contactIconUrls').then((module) => module.contactIconUrls)

interface ContactConsoleProps {
  items: readonly ContactItemData[]
}

/**
 * A compact contact console: one actionable row per channel (no form —
 * there is no backend). With no rows at all, an explicit pending state is
 * shown rather than a fabricated address or link.
 */
export function ContactConsole({ items }: ContactConsoleProps) {
  const iconUrls = useIconUrls(loadIconUrls)

  if (items.length === 0) {
    return (
      <div className="panel-section">
        <p className="panel-empty">Contact details are not yet available.</p>
      </div>
    )
  }

  return (
    <div className="panel-section contact">
      <p className="panel-meta panel-subtitle">Let&apos;s Connect</p>
      <ul className="contact-list">
        {items.map((item, index) => (
          <li
            key={item.id}
            className="panel-stagger-item"
            style={{ '--panel-order': index } as CSSProperties}
          >
            <ContactItem item={item} iconSrc={iconUrls?.[item.icon.file]} />
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Renders only from `src/data/contact.ts`: a channel the profile doesn't
 * define has no row. The shell (`InteractionOverlay`) mounts this only while
 * Contact is open, so its icons exist in the DOM — and are fetched — only
 * then.
 */
export function ContactPanel() {
  return <ContactConsole items={contactItems} />
}
