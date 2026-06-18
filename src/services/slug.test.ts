import { describe, it, expect } from 'vitest'
import { slugify, resolveFilename } from './slug'

describe('Slug Utility', () => {
  describe('slugify', () => {
    it('converts a simple title to lowercase hyphenated slug', () => {
      expect(slugify('Hello World')).toBe('hello-world')
    })

    it('removes diacritics (café → cafe)', () => {
      expect(slugify('café')).toBe('cafe')
    })

    it('removes diacritics (señal → senal)', () => {
      expect(slugify('señal')).toBe('senal')
    })

    it('removes diacritics (über → uber)', () => {
      expect(slugify('über')).toBe('uber')
    })

    it('removes diacritics (résumé → resume)', () => {
      expect(slugify('résumé')).toBe('resume')
    })

    it('replaces spaces with hyphens', () => {
      expect(slugify('my awesome note')).toBe('my-awesome-note')
    })

    it('replaces underscores with hyphens', () => {
      expect(slugify('my_awesome_note')).toBe('my-awesome-note')
    })

    it('replaces mixed spaces and underscores with hyphens', () => {
      expect(slugify('hello_world test_note')).toBe('hello-world-test-note')
    })

    it('collapses consecutive hyphens into one', () => {
      expect(slugify('hello---world')).toBe('hello-world')
    })

    it('collapses hyphens created by stripping special chars', () => {
      expect(slugify('hello!!!world')).toBe('helloworld')
    })

    it('collapses hyphens from mixed replacements', () => {
      expect(slugify('a _ _ b')).toBe('a-b')
    })

    it('strips characters not in [a-z0-9-]', () => {
      expect(slugify('Hello! @World #2024')).toBe('hello-world-2024')
    })

    it('strips emoji and special unicode', () => {
      expect(slugify('📝 My Note')).toBe('my-note')
    })

    it('preserves numbers', () => {
      expect(slugify('Chapter 42 Notes')).toBe('chapter-42-notes')
    })

    it('truncates to max 100 characters', () => {
      const longTitle = 'a'.repeat(150)
      const result = slugify(longTitle)
      expect(result.length).toBeLessThanOrEqual(100)
      expect(result).toBe('a'.repeat(100))
    })

    it('trims trailing hyphens after truncation', () => {
      // Create a title that, after processing, would have a hyphen at position 100
      const title = 'a'.repeat(99) + ' ' + 'b'.repeat(50)
      const result = slugify(title)
      expect(result.length).toBeLessThanOrEqual(100)
      expect(result).not.toMatch(/-$/)
    })

    it('trims trailing hyphens specifically after truncation breaks a word', () => {
      // 100 a's followed by "-b" → after truncation to 100: just "aaa...a" (100 a's)
      const title = 'a'.repeat(100) + '-b'
      const result = slugify(title)
      expect(result).toBe('a'.repeat(100))
      expect(result).not.toMatch(/-$/)
    })

    it('trims trailing hyphen that appears exactly at the cut point', () => {
      // 99 a's + space → "aaa...a-" which is 100 chars, trailing hyphen must be trimmed
      const title = 'a'.repeat(99) + ' '
      const result = slugify(title)
      expect(result).toBe('a'.repeat(99))
      expect(result).not.toMatch(/-$/)
    })

    it('returns "untitled" for empty string', () => {
      expect(slugify('')).toBe('untitled')
    })

    it('returns "untitled" when all characters are stripped', () => {
      expect(slugify('!!!@@@###')).toBe('untitled')
    })

    it('returns "untitled" for whitespace-only input', () => {
      expect(slugify('   ')).toBe('untitled')
    })

    it('returns "untitled" for emoji-only input', () => {
      expect(slugify('🎉🎊🎈')).toBe('untitled')
    })

    it('handles mixed diacritics and special chars', () => {
      expect(slugify('Ñoño & Niño: ¡Hola!')).toBe('nono-nino-hola')
    })

    it('handles leading and trailing hyphens from special chars', () => {
      expect(slugify('--hello--')).toBe('hello')
    })

    it('handles a realistic note title', () => {
      expect(slugify('Meeting Notes: Q4 Planning (2024)')).toBe('meeting-notes-q4-planning-2024')
    })
  })

  describe('resolveFilename', () => {
    it('returns slug.md when no conflict exists', () => {
      const result = resolveFilename('my-note', [])
      expect(result).toBe('my-note.md')
    })

    it('returns slug.md when existing files do not conflict', () => {
      const result = resolveFilename('my-note', ['other-note.md', 'another.md'])
      expect(result).toBe('my-note.md')
    })

    it('appends -2 suffix on first conflict', () => {
      const result = resolveFilename('my-note', ['my-note.md'])
      expect(result).toBe('my-note-2.md')
    })

    it('appends -3 suffix when -2 is also taken', () => {
      const result = resolveFilename('my-note', ['my-note.md', 'my-note-2.md'])
      expect(result).toBe('my-note-3.md')
    })

    it('finds the first available suffix in a gap', () => {
      const existing = ['my-note.md', 'my-note-2.md', 'my-note-3.md', 'my-note-5.md']
      const result = resolveFilename('my-note', existing)
      expect(result).toBe('my-note-4.md')
    })

    it('handles suffix up to 99', () => {
      const existing = Array.from({ length: 98 }, (_, i) =>
        i === 0 ? 'my-note.md' : `my-note-${i + 1}.md`,
      )
      const result = resolveFilename('my-note', existing)
      expect(result).toBe('my-note-99.md')
    })

    it('throws when all 99 attempts are exhausted', () => {
      const existing = ['my-note.md']
      for (let i = 2; i <= 99; i++) {
        existing.push(`my-note-${i}.md`)
      }

      expect(() => resolveFilename('my-note', existing)).toThrow(
        /all 99 suffix attempts exhausted/,
      )
    })

    it('works with untitled slug', () => {
      const result = resolveFilename('untitled', ['untitled.md'])
      expect(result).toBe('untitled-2.md')
    })
  })
})
