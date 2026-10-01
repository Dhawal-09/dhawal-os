import type { ContactItem as ContactItemData } from '../../data/types'
import { PanelIcon } from '../panel-icons/PanelIcon'

interface ContactItemProps {
  item: ContactItemData
  /** Undefined until the icon URL map has loaded; the row doesn't wait. */
  iconSrc: string | undefined
}

/**
 * One contact channel as a single link: icon, label, value. `mailto:` and
 * `tel:` hand off to the device's own app; profile links and the resume
 * open in a new tab so the game session underneath is never navigated away.
 */
export function ContactItem({ item, iconSrc }: ContactItemProps) {
  const opensNewTab = item.action === 'external' || item.action === 'resume'
  return (
    <a
      className="contact-item"
      href={item.href}
      {...(opensNewTab && { target: '_blank', rel: 'noopener noreferrer' })}
    >
      <span className="contact-item-icon">
        {/* Decorative: the label beside it already names the channel. */}
        <PanelIcon icon={item.icon} src={iconSrc} alt="" />
      </span>
      <span className="contact-item-text">
        <span className="contact-item-label">{item.label}</span>
        <span className="contact-item-value">{item.value}</span>
      </span>
      <span className="contact-item-go" aria-hidden="true">
        &gt;
      </span>
    </a>
  )
}
