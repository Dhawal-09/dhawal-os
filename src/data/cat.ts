/**
 * Flavor content for the Education room's easter-egg cat — not a portfolio
 * section, purely decorative. Edit freely; nothing else derives from this.
 */
export const cat = {
  name: 'Ginger',
  title: '"Head of Napping"',
  summary: '“No degree. No deadlines. Still somehow part of the team.”',
}

/**
 * The single source of truth for the Whiskers ID-portrait asset path
 * (matches the `RESUME_PDF_PATH` pattern in `data/resume.ts`), shared by
 * whatever renders it (`CatPanel`) so the path is never duplicated. The
 * portrait itself has not been supplied to the repository yet — `CatPanel`
 * shows a placeholder frame until a real image exists at this path, and
 * picking it up then requires no code change, only dropping the file in.
 * Deliberately NOT `assets/world/special/cat.png` — that PNG is the
 * separate, already-approved sleeping-cat-on-rug world sprite
 * (`educationRoom.ts` `education-reading-cat`); this is a distinct
 * forward-facing ID-photo asset for the profile panel, never a shared file.
 */
export const WHISKERS_PORTRAIT_PATH = '/assets/special/whiskers-portrait.png'
