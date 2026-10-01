import { toIconUrls } from '../panel-icons/iconUrls'

/**
 * Every icon in `assets/world/Icons/Contacts/`, by exact filename. Loaded on
 * demand by `ContactPanel` — never imported statically.
 */
export const contactIconUrls = toIconUrls(
  import.meta.glob<string>('../../../assets/world/Icons/Contacts/*.png', {
    eager: true,
    query: '?url',
    import: 'default',
  }),
)
