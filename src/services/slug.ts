/**
 * Slug generation utility for filesystem-safe filenames.
 *
 * Converts note titles into clean, readable slugs suitable for .md filenames.
 * Handles diacritics, special characters, length limits, and conflict resolution.
 */

const MAX_SLUG_LENGTH = 100

/**
 * Converts a title string into a filesystem-safe slug.
 *
 * Steps:
 * 1. NFD normalize to decompose diacritics
 * 2. Strip combining marks (diacritics)
 * 3. Convert to lowercase
 * 4. Replace spaces and underscores with hyphens
 * 5. Strip characters not in [a-z0-9-]
 * 6. Collapse consecutive hyphens into one
 * 7. Truncate to max 100 characters
 * 8. Trim trailing hyphens after truncation
 * 9. If result is empty, return "untitled"
 */
export function slugify(title: string): string {
  let slug = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\s_]/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+/, '')

  slug = slug.slice(0, MAX_SLUG_LENGTH).replace(/-+$/, '')

  return slug || 'untitled'
}

/**
 * Resolves a filename by appending a numeric suffix if the base slug conflicts
 * with existing files.
 *
 * Tries ${slug}.md first, then ${slug}-2.md through ${slug}-99.md.
 * Throws an Error if all 99 attempts conflict.
 */
export function resolveFilename(slug: string, existingFiles: string[]): string {
  const base = `${slug}.md`
  if (!existingFiles.includes(base)) {
    return base
  }

  for (let i = 2; i <= 99; i++) {
    const candidate = `${slug}-${i}.md`
    if (!existingFiles.includes(candidate)) {
      return candidate
    }
  }

  throw new Error(`Cannot resolve filename for slug "${slug}": all 99 suffix attempts exhausted`)
}
