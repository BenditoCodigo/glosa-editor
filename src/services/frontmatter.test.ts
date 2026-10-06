import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { parseMarkdownFile, frontmatterToNote, serializeNote } from './frontmatter'
import type { Note } from '@/types/note'

// --- Test helpers ---

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: 'test-uuid-1234',
    title: 'Test Note',
    content: '# Hello\n\nSome content here.',
    folder: null,
    isFavorite: false,
    createdAt: '2024-10-14T10:00:00Z',
    updatedAt: '2024-10-14T12:30:00Z',
    tags: ['idea', 'project'],
    ...overrides,
  }
}

function makeMarkdown(frontmatter: string, body: string): string {
  return `---\n${frontmatter}---\n${body}`
}

// --- Tests ---

describe('Frontmatter Parser', () => {
  describe('parseMarkdownFile', () => {
    it('parses valid frontmatter with all fields', () => {
      const content = makeMarkdown(
        'id: abc-123\ntitle: My Note\ncreatedAt: 2024-10-14T10:00:00Z\nupdatedAt: 2024-10-14T12:00:00Z\ntags: [idea, draft]\nisFavorite: true\nemoji: 📝\ncoverImage: cover.png\n',
        '# Hello World\n\nContent here.',
      )

      const result = parseMarkdownFile('my-note.md', content)

      expect(result.frontmatter.id).toBe('abc-123')
      expect(result.frontmatter.title).toBe('My Note')
      expect(result.frontmatter.createdAt).toBe('2024-10-14T10:00:00Z')
      expect(result.frontmatter.updatedAt).toBe('2024-10-14T12:00:00Z')
      expect(result.frontmatter.tags).toEqual(['idea', 'draft'])
      expect(result.frontmatter.isFavorite).toBe(true)
      expect(result.frontmatter.emoji).toBe('📝')
      expect(result.frontmatter.coverImage).toBe('cover.png')
      expect(result.body).toBe('# Hello World\n\nContent here.')
    })

    it('returns empty frontmatter when no delimiters present', () => {
      const content = '# Just a heading\n\nSome content'
      const result = parseMarkdownFile('plain.md', content)

      expect(result.frontmatter).toEqual({})
      expect(result.body).toBe(content)
    })

    it('returns empty frontmatter when only opening delimiter exists', () => {
      const content = '---\nid: test\ntitle: Broken'
      const result = parseMarkdownFile('broken.md', content)

      expect(result.frontmatter).toEqual({})
      expect(result.body).toBe(content)
    })

    it('handles empty frontmatter block', () => {
      const content = '---\n---\nBody content'
      const result = parseMarkdownFile('empty-fm.md', content)

      expect(result.frontmatter).toEqual({})
      expect(result.body).toBe('Body content')
    })

    it('handles empty body after frontmatter', () => {
      const content = '---\nid: test\n---\n'
      const result = parseMarkdownFile('no-body.md', content)

      expect(result.frontmatter.id).toBe('test')
      expect(result.body).toBe('')
    })

    it('preserves body byte-for-byte (first newline after --- is separator)', () => {
      const body = 'Line 1\nLine 2\n\nLine 4\n'
      const content = `---\nid: x\n---\n${body}`
      const result = parseMarkdownFile('test.md', content)

      expect(result.body).toBe(body)
    })

    it('parses quoted string values', () => {
      const content = makeMarkdown('title: "My Note: A Story"\nid: "123"\n', 'Body')
      const result = parseMarkdownFile('test.md', content)

      expect(result.frontmatter.title).toBe('My Note: A Story')
      expect(result.frontmatter.id).toBe('123')
    })

    it('parses single-quoted string values', () => {
      const content = makeMarkdown("title: 'Hello World'\n", 'Body')
      const result = parseMarkdownFile('test.md', content)
      expect(result.frontmatter.title).toBe('Hello World')
    })

    it('parses boolean values', () => {
      const content = makeMarkdown('isFavorite: true\narchived: false\n', 'Body')
      const result = parseMarkdownFile('test.md', content)

      expect(result.frontmatter.isFavorite).toBe(true)
      expect(result.frontmatter.archived).toBe(false)
    })

    it('parses empty array', () => {
      const content = makeMarkdown('tags: []\n', 'Body')
      const result = parseMarkdownFile('test.md', content)
      expect(result.frontmatter.tags).toEqual([])
    })

    it('parses flow sequence with items', () => {
      const content = makeMarkdown('tags: [one, two, three]\n', 'Body')
      const result = parseMarkdownFile('test.md', content)
      expect(result.frontmatter.tags).toEqual(['one', 'two', 'three'])
    })

    it('parses flow sequence with quoted items', () => {
      const content = makeMarkdown('tags: ["has, comma", "normal"]\n', 'Body')
      const result = parseMarkdownFile('test.md', content)
      expect(result.frontmatter.tags).toEqual(['has, comma', 'normal'])
    })

    it('parses null values', () => {
      const content = makeMarkdown('emoji: null\ncover: ~\nempty:\n', 'Body')
      const result = parseMarkdownFile('test.md', content)

      expect(result.frontmatter.emoji).toBeNull()
      expect(result.frontmatter.cover).toBeNull()
      expect(result.frontmatter.empty).toBeNull()
    })

    it('preserves unrecognized YAML keys', () => {
      const content = makeMarkdown(
        'id: test\ntitle: Note\ncustomField: hello\nanotherMeta: 42\n',
        'Body',
      )
      const result = parseMarkdownFile('test.md', content)

      expect(result.frontmatter.customField).toBe('hello')
      expect(result.frontmatter.anotherMeta).toBe(42)
    })

    it('skips comment lines in YAML', () => {
      const content = makeMarkdown('# This is a comment\nid: test\n', 'Body')
      const result = parseMarkdownFile('test.md', content)

      expect(result.frontmatter.id).toBe('test')
      expect(Object.keys(result.frontmatter)).toHaveLength(1)
    })

    it('handles completely empty content', () => {
      const result = parseMarkdownFile('empty.md', '')
      expect(result.frontmatter).toEqual({})
      expect(result.body).toBe('')
    })
  })

  describe('frontmatterToNote', () => {
    let mockNow: string

    beforeEach(() => {
      mockNow = '2024-11-01T00:00:00.000Z'
      vi.useFakeTimers()
      vi.setSystemTime(new Date(mockNow))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('creates a Note from valid frontmatter', () => {
      const fm: Record<string, unknown> = {
        id: 'uuid-1',
        title: 'My Note',
        createdAt: '2024-10-14T10:00:00Z',
        updatedAt: '2024-10-14T12:00:00Z',
        tags: ['idea'],
        isFavorite: true,
        emoji: '📝',
        coverImage: 'cover.png',
      }

      const note = frontmatterToNote(fm, 'Body content', 'ideas')

      expect(note.id).toBe('uuid-1')
      expect(note.title).toBe('My Note')
      expect(note.content).toBe('Body content')
      expect(note.folder).toBe('ideas')
      expect(note.isFavorite).toBe(true)
      expect(note.createdAt).toBe('2024-10-14T10:00:00Z')
      expect(note.updatedAt).toBe('2024-10-14T12:00:00Z')
      expect(note.tags).toEqual(['idea'])
      expect(note.emoji).toBe('📝')
      expect(note.coverImage).toBe('cover.png')
    })

    it('generates defaults when frontmatter is empty', () => {
      const note = frontmatterToNote({}, '', null, 'my-first-note.md')

      expect(note.id).toMatch(/^[0-9a-f-]+$/)
      expect(note.title).toBe('my first note')
      expect(note.content).toBe('')
      expect(note.folder).toBeNull()
      expect(note.isFavorite).toBe(false)
      expect(note.createdAt).toBe(mockNow)
      expect(note.updatedAt).toBe(mockNow)
      expect(note.tags).toEqual([])
      expect(note.emoji).toBeUndefined()
      expect(note.coverImage).toBeUndefined()
    })

    it('uses default for invalid date fields', () => {
      const fm: Record<string, unknown> = {
        id: 'test',
        title: 'Test',
        createdAt: 'not-a-date',
        updatedAt: 12345,
      }

      const note = frontmatterToNote(fm, '', null)

      expect(note.createdAt).toBe(mockNow)
      expect(note.updatedAt).toBe(mockNow)
    })

    it('uses default for invalid tags field', () => {
      const fm: Record<string, unknown> = {
        id: 'test',
        title: 'Test',
        tags: 'not-an-array',
      }

      const note = frontmatterToNote(fm, '', null)
      expect(note.tags).toEqual([])
    })

    it('uses default for tags array with non-string items', () => {
      const fm: Record<string, unknown> = {
        id: 'test',
        title: 'Test',
        tags: [1, 2, 3],
      }

      const note = frontmatterToNote(fm, '', null)
      expect(note.tags).toEqual([])
    })

    it('uses default for invalid isFavorite field', () => {
      const fm: Record<string, unknown> = {
        id: 'test',
        title: 'Test',
        isFavorite: 'yes',
      }

      const note = frontmatterToNote(fm, '', null)
      expect(note.isFavorite).toBe(false)
    })

    it('preserves valid fields when others are invalid', () => {
      const fm: Record<string, unknown> = {
        id: 'valid-id',
        title: 'Valid Title',
        createdAt: 'invalid',
        tags: ['valid-tag'],
        isFavorite: true,
      }

      const note = frontmatterToNote(fm, 'content', null)

      expect(note.id).toBe('valid-id')
      expect(note.title).toBe('Valid Title')
      expect(note.createdAt).toBe(mockNow) // default for invalid
      expect(note.tags).toEqual(['valid-tag']) // preserved valid
      expect(note.isFavorite).toBe(true) // preserved valid
    })

    it('derives title from filename when title is missing', () => {
      const note = frontmatterToNote({ id: 'x' }, '', null, 'my-awesome-note.md')
      expect(note.title).toBe('my awesome note')
    })

    it('uses Untitled when no title and no filename', () => {
      const note = frontmatterToNote({ id: 'x' }, '', null)
      expect(note.title).toBe('Untitled')
    })

    it('does not set emoji/coverImage when they are empty strings in frontmatter', () => {
      const fm: Record<string, unknown> = {
        id: 'test',
        title: 'Test',
        emoji: '',
        coverImage: '',
      }
      const note = frontmatterToNote(fm, '', null)
      expect(note.emoji).toBeUndefined()
      expect(note.coverImage).toBeUndefined()
    })
  })

  describe('serializeNote', () => {
    it('produces frontmatter with deterministic field order', () => {
      const note = makeNote()
      const result = serializeNote(note)

      const lines = result.split('\n')
      expect(lines[0]).toBe('---')
      expect(lines[1]).toContain('id:')
      expect(lines[2]).toContain('title:')
      expect(lines[3]).toContain('createdAt:')
      expect(lines[4]).toContain('updatedAt:')
      expect(lines[5]).toContain('tags:')
      expect(lines[6]).toContain('isFavorite:')
      // emoji and coverImage omitted (undefined)
      expect(lines[7]).toBe('---')
    })

    it('includes emoji and coverImage when present', () => {
      const note = makeNote({ emoji: '📝', coverImage: 'img.png' })
      const result = serializeNote(note)

      expect(result).toContain('emoji: 📝')
      expect(result).toContain('coverImage: img.png')
    })

    it('omits emoji and coverImage when undefined', () => {
      const note = makeNote({ emoji: undefined, coverImage: undefined })
      const result = serializeNote(note)

      expect(result).not.toContain('emoji:')
      expect(result).not.toContain('coverImage:')
    })

    it('serializes tags as YAML flow sequence', () => {
      const note = makeNote({ tags: ['idea', 'project'] })
      const result = serializeNote(note)
      expect(result).toContain('tags: [idea, project]')
    })

    it('serializes empty tags as empty array', () => {
      const note = makeNote({ tags: [] })
      const result = serializeNote(note)
      expect(result).toContain('tags: []')
    })

    it('serializes isFavorite as boolean', () => {
      const note = makeNote({ isFavorite: true })
      const result = serializeNote(note)
      expect(result).toContain('isFavorite: true')
    })

    it('serializes dates as ISO 8601 with UTC', () => {
      const note = makeNote({
        createdAt: '2024-10-14T10:00:00Z',
        updatedAt: '2024-10-14T12:30:00Z',
      })
      const result = serializeNote(note)
      expect(result).toContain('createdAt: 2024-10-14T10:00:00Z')
      expect(result).toContain('updatedAt: 2024-10-14T12:30:00Z')
    })

    it('quotes title with special YAML characters', () => {
      const note = makeNote({ title: 'My Note: A Story [Draft]' })
      const result = serializeNote(note)
      expect(result).toContain('title: "My Note: A Story [Draft]"')
    })

    it('quotes values that look like booleans', () => {
      const note = makeNote({ title: 'true' })
      const result = serializeNote(note)
      expect(result).toContain('title: "true"')
    })

    it('quotes values that look like numbers', () => {
      const note = makeNote({ title: '42' })
      const result = serializeNote(note)
      expect(result).toContain('title: "42"')
    })

    it('quotes empty string values', () => {
      const note = makeNote({ title: '' })
      const result = serializeNote(note)
      expect(result).toContain('title: ""')
    })

    it('appends body after frontmatter with separator newline', () => {
      const note = makeNote({ content: '# Hello\n\nWorld' })
      const result = serializeNote(note)

      const parts = result.split('---\n')
      // parts[0] is empty (before first ---)
      // parts[1] is frontmatter content
      // parts[2] is body (after closing ---)
      expect(parts[2]).toBe('# Hello\n\nWorld')
    })

    it('appends extra fields in alphabetical order', () => {
      const note = makeNote()
      const extra = { zebra: 'last', alpha: 'first', middle: 'mid' }
      const result = serializeNote(note, extra)

      const lines = result.split('\n')
      const alphaIdx = lines.findIndex((l) => l.startsWith('alpha:'))
      const middleIdx = lines.findIndex((l) => l.startsWith('middle:'))
      const zebraIdx = lines.findIndex((l) => l.startsWith('zebra:'))

      expect(alphaIdx).toBeLessThan(middleIdx)
      expect(middleIdx).toBeLessThan(zebraIdx)
    })

    it('handles tags with special characters by quoting', () => {
      const note = makeNote({ tags: ['c#', 'a, b'] })
      const result = serializeNote(note)
      expect(result).toContain('tags: ["c#", "a, b"]')
    })

    it('handles multiline content body', () => {
      const body = '# Title\n\nParagraph one.\n\n## Section\n\nParagraph two.\n'
      const note = makeNote({ content: body })
      const result = serializeNote(note)

      // Parse it back and check body integrity
      const parsed = parseMarkdownFile('test.md', result)
      expect(parsed.body).toBe(body)
    })
  })

  describe('Round-trip integrity', () => {
    it('serialize then parse produces equivalent Note (basic)', () => {
      const original = makeNote()
      const serialized = serializeNote(original)
      const parsed = parseMarkdownFile('test.md', serialized)
      const restored = frontmatterToNote(parsed.frontmatter, parsed.body, original.folder)

      expect(restored.id).toBe(original.id)
      expect(restored.title).toBe(original.title)
      expect(restored.content).toBe(original.content)
      expect(restored.isFavorite).toBe(original.isFavorite)
      expect(restored.createdAt).toBe(original.createdAt)
      expect(restored.updatedAt).toBe(original.updatedAt)
      expect(restored.tags).toEqual(original.tags)
    })

    it('serialize then parse preserves emoji and coverImage', () => {
      const original = makeNote({ emoji: '🎉', coverImage: 'http://example.com/img.png' })
      const serialized = serializeNote(original)
      const parsed = parseMarkdownFile('test.md', serialized)
      const restored = frontmatterToNote(parsed.frontmatter, parsed.body, original.folder)

      expect(restored.emoji).toBe(original.emoji)
      expect(restored.coverImage).toBe(original.coverImage)
    })

    it('serialize then parse preserves empty tags', () => {
      const original = makeNote({ tags: [] })
      const serialized = serializeNote(original)
      const parsed = parseMarkdownFile('test.md', serialized)
      const restored = frontmatterToNote(parsed.frontmatter, parsed.body, original.folder)

      expect(restored.tags).toEqual([])
    })

    it('serialize then parse preserves body byte-for-byte', () => {
      const body = '# Heading\n\n- Item 1\n- Item 2\n\n```ts\nconst x = 1;\n```\n'
      const original = makeNote({ content: body })
      const serialized = serializeNote(original)
      const parsed = parseMarkdownFile('test.md', serialized)

      expect(parsed.body).toBe(body)
    })

    it('preserves unrecognized fields through round-trip', () => {
      const original = makeNote()
      const extra = { customKey: 'custom-value', rating: 5 }
      const serialized = serializeNote(original, extra)
      const parsed = parseMarkdownFile('test.md', serialized)

      expect(parsed.frontmatter.customKey).toBe('custom-value')
      expect(parsed.frontmatter.rating).toBe(5)
    })

    it('repeated serialization produces identical output', () => {
      const note = makeNote({ emoji: '📝', coverImage: 'cover.png' })
      const extra = { zoo: 'animal', bar: 'drink' }

      const first = serializeNote(note, extra)
      const second = serializeNote(note, extra)

      expect(first).toBe(second)
    })

    it('round-trip with title containing special characters', () => {
      const original = makeNote({ title: 'Notes: "Important" [Draft] {WIP}' })
      const serialized = serializeNote(original)
      const parsed = parseMarkdownFile('test.md', serialized)
      const restored = frontmatterToNote(parsed.frontmatter, parsed.body, original.folder)

      expect(restored.title).toBe(original.title)
    })

    it('round-trip with isFavorite false (not omitted)', () => {
      const original = makeNote({ isFavorite: false })
      const serialized = serializeNote(original)
      const parsed = parseMarkdownFile('test.md', serialized)
      const restored = frontmatterToNote(parsed.frontmatter, parsed.body, null)

      expect(restored.isFavorite).toBe(false)
    })

    it('round-trip with empty content body', () => {
      const original = makeNote({ content: '' })
      const serialized = serializeNote(original)
      const parsed = parseMarkdownFile('test.md', serialized)
      const restored = frontmatterToNote(parsed.frontmatter, parsed.body, null)

      expect(restored.content).toBe('')
    })

    it('round-trip with sources and aiInstructions', () => {
      const original = makeNote({
        sources: ['https://elpais.com/investigacion/art1', 'https://bbc.com/news/123'],
        aiInstructions: 'Eres un editor de investigación riguroso. Contrasta fuentes y fechas.',
      })
      const serialized = serializeNote(original)
      const parsed = parseMarkdownFile('test.md', serialized)
      const restored = frontmatterToNote(parsed.frontmatter, parsed.body, null)

      expect(restored.sources).toEqual([
        'https://elpais.com/investigacion/art1',
        'https://bbc.com/news/123',
      ])
      expect(restored.aiInstructions).toBe(
        'Eres un editor de investigación riguroso. Contrasta fuentes y fechas.',
      )
    })

    it('round-trip with description', () => {
      const original = makeNote({
        description: 'Breve resumen de la nota para la tarjeta.',
      })
      const serialized = serializeNote(original)
      const parsed = parseMarkdownFile('test.md', serialized)
      const restored = frontmatterToNote(parsed.frontmatter, parsed.body, null)

      expect(restored.description).toBe('Breve resumen de la nota para la tarjeta.')
    })
  })
})
