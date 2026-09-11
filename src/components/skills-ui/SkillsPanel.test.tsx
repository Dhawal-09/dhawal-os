import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { skillGroups } from '../../data/skills'
import { SkillsPanel } from './SkillsPanel'

afterEach(() => {
  cleanup()
})

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

describe('SkillsPanel', () => {
  it('renders every skill group title and its skills', () => {
    render(<SkillsPanel />)

    for (const group of skillGroups) {
      expect(
        screen.getByRole('heading', { name: group.title }),
      ).toBeInTheDocument()
      for (const skill of group.skills) {
        expect(
          screen.getAllByText(new RegExp(escapeRegExp(skill))).length,
        ).toBeGreaterThan(0)
      }
    }
  })
})
