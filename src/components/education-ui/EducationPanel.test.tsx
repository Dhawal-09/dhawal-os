import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { InteractionOverlay } from '../../app/InteractionOverlay'
import { education } from '../../data/education'
import { gameEventBridge } from '../../game/events/GameEventBridge'
import { EducationPanel } from './EducationPanel'
import { EducationTimeline } from './EducationTimeline'

// The panel fetches its icon URL map on demand. Resolve that module once up
// front so no test's timing depends on the first (cold) dynamic import.
beforeAll(async () => {
  await import('./educationIconUrls')
})

afterEach(() => {
  cleanup()
})

function stops(): HTMLElement[] {
  const timeline = screen.getByRole('list', { name: /academic journey/i })
  return within(timeline).getAllByRole('listitem')
}

/** The icons, once the on-demand URL map has reached the mounted panel. */
async function icons(): Promise<HTMLImageElement[]> {
  await act(async () => {
    await import('./educationIconUrls')
  })
  return [...document.querySelectorAll<HTMLImageElement>('.education img')]
}

describe('EducationPanel', () => {
  it('shows the four stages as a timeline, in data order, each under its own heading', () => {
    render(<EducationPanel />)

    const items = stops()
    expect(items).toHaveLength(education.length)
    education.forEach((entry, index) => {
      expect(
        within(items[index]).getByRole('heading', {
          name: entry.title,
          level: 3,
        }),
      ).toBeInTheDocument()
    })
  })

  it('renders every detail the data supplies', () => {
    render(<EducationPanel />)

    const items = stops()
    education.forEach((entry, index) => {
      const item = within(items[index])
      for (const text of [
        entry.degree,
        entry.institution,
        entry.university,
        entry.grade,
      ]) {
        if (text) expect(item.getByText(text)).toBeInTheDocument()
      }
    })
    expect(items[0]).toHaveTextContent('2017 - 2018')
    expect(items[1]).toHaveTextContent('2018 - 2020')
    expect(items[2]).toHaveTextContent('2020 - 2023')
    expect(items[3]).toHaveTextContent('2023 - 2025')
  })

  it('shows a stage with no supplied details as just its heading — nothing invented', () => {
    const { title, icon, id, level } = education[0]
    render(
      <EducationTimeline
        entries={[{ id, level, title, icon }]}
        iconUrls={null}
      />,
    )

    const [stage] = stops()
    expect(stage).toHaveTextContent(new RegExp(`^${title}$`))
    expect(stage.querySelectorAll('p')).toHaveLength(0)
  })

  it('renders one icon per stage from its own file, with its native size reserved', async () => {
    render(<EducationPanel />)

    const imgs = await icons()
    expect(imgs).toHaveLength(education.length)
    education.forEach((entry, index) => {
      expect(imgs[index].getAttribute('src')).toContain(entry.icon.file)
      expect(imgs[index]).toHaveAttribute('width', String(entry.icon.width))
      expect(imgs[index]).toHaveAttribute('height', String(entry.icon.height))
      expect(imgs[index]).toHaveAttribute('decoding', 'async')
    })
  })
})

describe('Education icons are only in the DOM while the panel is open', () => {
  it('mounts no icon before Education opens, and removes them all when it closes', async () => {
    const user = userEvent.setup()
    render(<InteractionOverlay />)
    expect(document.querySelectorAll('img')).toHaveLength(0)

    act(() => {
      gameEventBridge.emit('OPEN_EDUCATION')
    })
    expect(await icons()).toHaveLength(education.length)

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.querySelectorAll('img')).toHaveLength(0)
  })
})
