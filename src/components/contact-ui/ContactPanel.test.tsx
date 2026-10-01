import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { InteractionOverlay } from '../../app/InteractionOverlay'
import { buildContactItems, contactItems } from '../../data/contact'
import { gameEventBridge } from '../../game/events/GameEventBridge'
import { ContactConsole, ContactPanel } from './ContactPanel'

// The panel fetches its icon URL map on demand. Resolve that module once up
// front so no test's timing depends on the first (cold) dynamic import.
beforeAll(async () => {
  await import('./contactIconUrls')
})

afterEach(() => {
  cleanup()
})

const FULL_ITEMS = buildContactItems({
  email: 'someone@example.com',
  phone: '+00 12345 67890',
  linkedin: 'https://www.linkedin.com/in/someone',
  github: 'https://github.com/someone',
  resume: '/resume.pdf',
  portfolio: 'https://example.com',
})

/** The icons, once the on-demand URL map has reached the mounted panel. */
async function icons(): Promise<HTMLImageElement[]> {
  await act(async () => {
    await import('./contactIconUrls')
  })
  return [...document.querySelectorAll<HTMLImageElement>('.contact img')]
}

describe('ContactConsole', () => {
  it('renders one actionable link per channel, labelled and showing its value', () => {
    render(<ContactConsole items={FULL_ITEMS} />)

    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(FULL_ITEMS.length)
    FULL_ITEMS.forEach((item, index) => {
      expect(links[index]).toHaveAttribute('href', item.href)
      expect(links[index]).toHaveTextContent(item.label)
      expect(links[index]).toHaveTextContent(item.value)
    })
  })

  it('opens profile links and the resume in a new tab, safely', () => {
    render(<ContactConsole items={FULL_ITEMS} />)

    for (const name of [/linkedin/i, /github/i, /resume/i, /portfolio/i]) {
      const link = screen.getByRole('link', { name })
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    }
  })

  it('hands email and phone to the device instead of opening a tab', () => {
    render(<ContactConsole items={FULL_ITEMS} />)

    const email = screen.getByRole('link', { name: /email/i })
    const phone = screen.getByRole('link', { name: /phone/i })
    expect(email).toHaveAttribute('href', 'mailto:someone@example.com')
    expect(phone).toHaveAttribute('href', 'tel:+001234567890')
    expect(email).not.toHaveAttribute('target')
    expect(phone).not.toHaveAttribute('target')
  })

  it('renders one icon per channel from its own file, with its native size reserved', async () => {
    render(<ContactConsole items={FULL_ITEMS} />)

    const imgs = await icons()
    expect(imgs).toHaveLength(FULL_ITEMS.length)
    FULL_ITEMS.forEach((item, index) => {
      expect(imgs[index].getAttribute('src')).toContain(item.icon.file)
      expect(imgs[index]).toHaveAttribute('width', String(item.icon.width))
      expect(imgs[index]).toHaveAttribute('height', String(item.icon.height))
      expect(imgs[index]).toHaveAttribute('decoding', 'async')
    })
  })

  it('is never a form', () => {
    render(<ContactConsole items={FULL_ITEMS} />)

    expect(document.querySelector('form, input, textarea')).toBeNull()
  })

  it('renders an explicit pending state rather than a fabricated address or link when nothing is supplied', () => {
    render(<ContactConsole items={[]} />)

    expect(screen.getByText(/not yet available/i)).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})

describe('ContactPanel', () => {
  it('renders exactly the channels defined in src/data/contact.ts', () => {
    render(<ContactPanel />)

    const links = screen.queryAllByRole('link')
    expect(links.map((link) => link.getAttribute('href'))).toEqual(
      contactItems.map((item) => item.href),
    )
  })

  it('mounts no icon before Contact opens, and removes them all when it closes', async () => {
    const user = userEvent.setup()
    render(<InteractionOverlay />)
    expect(document.querySelectorAll('img')).toHaveLength(0)

    act(() => {
      gameEventBridge.emit('OPEN_CONTACT')
    })
    expect(await icons()).toHaveLength(contactItems.length)

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.querySelectorAll('img')).toHaveLength(0)
  })
})
