import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { InteractionOverlay } from '../../app/InteractionOverlay'
import { skillGroups } from '../../data/skills'
import { gameEventBridge } from '../../game/events/GameEventBridge'
import { SkillsPanel } from './SkillsPanel'

// The panel fetches its icon URL map on demand. Resolve that module once up
// front so no test's timing depends on the first (cold) dynamic import.
beforeAll(async () => {
  await import('./skillIconUrls')
})

afterEach(() => {
  cleanup()
})

const skillsWithIcon = skillGroups.flatMap((group) =>
  group.skills.filter((skill) => skill.icon),
)
const skillsWithoutIcon = skillGroups.flatMap((group) =>
  group.skills.filter((skill) => !skill.icon),
)

describe('SkillsPanel', () => {
  it('renders a semantic heading for every category that has icons', () => {
    render(<SkillsPanel />)

    for (const group of skillGroups) {
      if (!group.skills.some((skill) => skill.icon)) continue
      expect(
        screen.getByRole('heading', { name: group.title, level: 3 }),
      ).toBeInTheDocument()
    }
  })

  it('renders exactly one icon per skill that has an asset, with its name as alt text and its native size reserved', async () => {
    render(<SkillsPanel />)

    expect(await screen.findAllByRole('img')).toHaveLength(
      skillsWithIcon.length,
    )
    for (const skill of skillsWithIcon) {
      const img = screen.getByAltText(skill.name)
      expect(img.getAttribute('src')).toContain(skill.icon!.file)
      expect(img).toHaveAttribute('width', String(skill.icon!.width))
      expect(img).toHaveAttribute('height', String(skill.icon!.height))
      expect(img).toHaveAttribute('decoding', 'async')
    }
  })

  it('omits a skill that has no icon asset instead of substituting text', async () => {
    render(<SkillsPanel />)
    await screen.findAllByRole('img')

    for (const skill of skillsWithoutIcon) {
      expect(screen.queryByAltText(skill.name)).not.toBeInTheDocument()
      expect(screen.queryByText(skill.name)).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: skill.name }),
      ).not.toBeInTheDocument()
    }
  })

  it('loads the first categories eagerly and leaves the ones further down to native lazy loading', async () => {
    render(<SkillsPanel />)
    await screen.findAllByRole('img')

    const sections = screen.getAllByRole('region')
    const loadingOf = (section: HTMLElement) =>
      within(section)
        .getAllByRole('img')
        .map((img) => img.getAttribute('loading'))

    expect(new Set(loadingOf(sections[0]))).toEqual(new Set(['eager']))
    expect(new Set(loadingOf(sections[sections.length - 1]))).toEqual(
      new Set(['lazy']),
    )
  })

  it('tapping an icon pins its name, and tapping it again releases it', async () => {
    const user = userEvent.setup()
    render(<SkillsPanel />)

    const button = screen.getByRole('button', { name: 'React' })
    expect(button).not.toHaveClass('is-active')

    await user.click(button)
    expect(button).toHaveClass('is-active')

    await user.click(button)
    expect(button).not.toHaveClass('is-active')
  })
})

describe('Skills icons are only in the DOM while the panel is open', () => {
  it('mounts no icon before Skills opens, and removes them all when it closes', async () => {
    const user = userEvent.setup()
    render(<InteractionOverlay />)
    expect(document.querySelectorAll('img')).toHaveLength(0)

    // Another panel being open must not mount the Skills icons either.
    act(() => {
      gameEventBridge.emit('OPEN_EDUCATION')
    })
    expect(document.querySelectorAll('.skills-icon img')).toHaveLength(0)

    act(() => {
      gameEventBridge.emit('OPEN_SKILLS')
    })
    await screen.findByAltText(skillsWithIcon[0].name)
    expect(document.querySelectorAll('.skills-icon img')).toHaveLength(
      skillsWithIcon.length,
    )

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.querySelectorAll('img')).toHaveLength(0)

    // Re-opening mounts one fresh set — never duplicates.
    act(() => {
      gameEventBridge.emit('OPEN_SKILLS')
    })
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(document.querySelectorAll('.skills-icon img')).toHaveLength(
      skillsWithIcon.length,
    )
  })
})
