import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { InteractionOverlay } from '../../app/InteractionOverlay'
import { projects } from '../../data/projects'
import { gameEventBridge } from '../../game/events/GameEventBridge'

/** Every file actually present in the project icons folder. */
const ICON_FILES = new Set(
  Object.keys(import.meta.glob('../../../assets/world/Icons/Projects/*')).map(
    (path) => path.slice(path.lastIndexOf('/') + 1),
  ),
)

// The panel fetches its icon URL map on demand. Resolve that module once up
// front so no test's timing depends on the first (cold) dynamic import.
beforeAll(async () => {
  await import('./projectIconUrls')
})

afterEach(() => {
  cleanup()
})

async function openProjects(): Promise<void> {
  render(<InteractionOverlay />)
  act(() => {
    gameEventBridge.emit('OPEN_PROJECTS')
  })
  await act(async () => {
    await import('./projectIconUrls')
  })
}

function iconSources(): string[] {
  return [
    ...document.querySelectorAll<HTMLImageElement>('.panel-icon img'),
  ].map((img) => img.getAttribute('src') ?? '')
}

describe('project icons', () => {
  it('only reference files that exist in assets/world/Icons/Projects, one per project', () => {
    const files = projects.flatMap((p) => (p.icon ? [p.icon.file] : []))
    expect(files.length).toBeGreaterThan(0)
    expect(new Set(files).size).toBe(files.length)
    for (const file of files) {
      expect(ICON_FILES).toContain(file)
    }
  })

  it('are not mounted on the home screen — nothing is fetched until a list is opened', async () => {
    await openProjects()
    expect(document.querySelectorAll('img')).toHaveLength(0)
  })

  it.each(['experience', 'personal'] as const)(
    'the %s list shows each project’s picture beside its name, and none for a project without one',
    async (category) => {
      const user = userEvent.setup()
      await openProjects()
      await user.click(
        screen.getByRole('button', {
          name: new RegExp(`${category} projects`, 'i'),
        }),
      )

      const listed = projects.filter((p) => p.category === category)
      const withIcon = listed.filter((p) => p.icon)
      expect(iconSources()).toHaveLength(withIcon.length)
      for (const project of listed) {
        const card = screen.getByRole('button', {
          name: new RegExp(`^${project.name}`),
        })
        const img = card.querySelector('img')
        if (project.icon) {
          expect(img?.getAttribute('src')).toContain(project.icon.file)
          expect(img).toHaveAttribute('decoding', 'async')
        } else {
          expect(img).toBeNull()
        }
      }
    },
  )

  it('the detail view shows the project’s picture in place of the placeholder', async () => {
    const user = userEvent.setup()
    const project = projects.find((p) => p.icon)!
    await openProjects()
    await user.click(
      screen.getByRole('button', {
        name: new RegExp(`${project.category} projects`, 'i'),
      }),
    )
    await user.click(
      screen.getByRole('button', { name: new RegExp(`^${project.name}`) }),
    )

    const img = screen.getByRole('img', {
      name: `${project.name} illustration`,
    })
    expect(img.getAttribute('src')).toContain(project.icon!.file)
    expect(screen.queryByText('Image')).not.toBeInTheDocument()
  })
})
