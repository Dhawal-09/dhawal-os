import { toIconUrls } from '../panel-icons/iconUrls'

/**
 * Every image in `assets/world/Icons/Projects/`, by exact filename. Loaded on
 * demand by `ProjectsPanel` — never imported statically.
 */
export const projectIconUrls = toIconUrls(
  import.meta.glob<string>('../../../assets/world/Icons/Projects/*.png', {
    eager: true,
    query: '?url',
    import: 'default',
  }),
)
