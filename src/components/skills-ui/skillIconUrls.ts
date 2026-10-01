import { toIconUrls } from '../panel-icons/iconUrls'

/**
 * Every technology icon directly in `assets/world/Icons/`, by exact filename.
 * Loaded on demand by `SkillsPanel` — never imported statically.
 */
export const skillIconUrls = toIconUrls(
  import.meta.glob<string>('../../../assets/world/Icons/*.png', {
    eager: true,
    query: '?url',
    import: 'default',
  }),
)
