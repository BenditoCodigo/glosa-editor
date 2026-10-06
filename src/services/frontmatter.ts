import type { Note } from '@/types/note'

/**
 * Minimal in-house YAML frontmatter parser/serializer for Note objects.
 * No external YAML library — handles only the limited Note schema.
 */

// --- Types ---

export interface ParsedNote {
  frontmatter: Record<string, unknown>
  body: string
}

// --- Constants ---

const FRONTMATTER_DELIMITER = '---'

/** Deterministic field order for serialization */
const _FIELD_ORDER: readonly string[] = [
  'id',
  'title',
  'createdAt',
  'updatedAt',
  'tags',
  'isFavorite',
  'emoji',
  'coverImage',
  'description',
  'sources',
  'aiInstructions',
  'temperature',
  'topP',
]

/** Characters that require quoting in YAML values */
const YAML_SPECIAL_CHARS = /[:{}[\],&*?|>!%@`#'"\\]/

/** ISO 8601 date pattern (basic validation) */
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/

// --- Parser ---

/**
 * Parses a markdown file with optional YAML frontmatter.
 * Returns raw frontmatter key-value pairs and the body content.
 */
export function parseMarkdownFile(filename: string, content: string): ParsedNote {
  const trimmedContent = content

  if (!trimmedContent.startsWith(FRONTMATTER_DELIMITER)) {
    return { frontmatter: {}, body: trimmedContent }
  }

  // Find the closing delimiter
  const closingIndex = trimmedContent.indexOf(
    `\n${FRONTMATTER_DELIMITER}`,
    FRONTMATTER_DELIMITER.length,
  )

  if (closingIndex === -1) {
    // No closing delimiter found — treat entire content as body
    return { frontmatter: {}, body: trimmedContent }
  }

  const yamlBlock = trimmedContent.slice(FRONTMATTER_DELIMITER.length + 1, closingIndex)
  const frontmatter = parseYamlBlock(yamlBlock)

  // Body starts after closing delimiter + newline separator
  const bodyStart = closingIndex + 1 + FRONTMATTER_DELIMITER.length
  // The first newline after closing --- is the separator (not part of body)
  const body =
    trimmedContent[bodyStart] === '\n'
      ? trimmedContent.slice(bodyStart + 1)
      : trimmedContent.slice(bodyStart)

  return { frontmatter, body }
}

/**
 * Converts raw frontmatter + body into a Note with validation and defaults.
 */
export function frontmatterToNote(
  frontmatter: Record<string, unknown>,
  body: string,
  folder: string | null,
  filename?: string,
): Note {
  const now = new Date().toISOString()

  const id =
    typeof frontmatter.id === 'string' && frontmatter.id.length > 0
      ? frontmatter.id
      : crypto.randomUUID()

  const title =
    typeof frontmatter.title === 'string' && frontmatter.title.length > 0
      ? frontmatter.title
      : deriveTitle(filename)

  const createdAt =
    typeof frontmatter.createdAt === 'string' && ISO_DATE_PATTERN.test(frontmatter.createdAt)
      ? frontmatter.createdAt
      : now

  const updatedAt =
    typeof frontmatter.updatedAt === 'string' && ISO_DATE_PATTERN.test(frontmatter.updatedAt)
      ? frontmatter.updatedAt
      : now

  const tags =
    Array.isArray(frontmatter.tags) && frontmatter.tags.every((t: unknown) => typeof t === 'string')
      ? (frontmatter.tags as string[])
      : []

  const isFavorite = typeof frontmatter.isFavorite === 'boolean' ? frontmatter.isFavorite : false

  const emoji =
    typeof frontmatter.emoji === 'string' && frontmatter.emoji.length > 0
      ? frontmatter.emoji
      : undefined

  const coverImage =
    typeof frontmatter.coverImage === 'string' && frontmatter.coverImage.length > 0
      ? frontmatter.coverImage
      : undefined

  const description =
    typeof frontmatter.description === 'string' && frontmatter.description.trim().length > 0
      ? frontmatter.description.trim()
      : undefined

  const sources =
    Array.isArray(frontmatter.sources) &&
    frontmatter.sources.every((s: unknown) => typeof s === 'string')
      ? (frontmatter.sources as string[]).filter((s) => s.trim().length > 0)
      : undefined

  const aiInstructions =
    typeof frontmatter.aiInstructions === 'string' && frontmatter.aiInstructions.trim().length > 0
      ? frontmatter.aiInstructions
      : undefined

  const temperature =
    typeof frontmatter.temperature === 'number' && !isNaN(frontmatter.temperature)
      ? frontmatter.temperature
      : undefined

  const topP =
    typeof frontmatter.topP === 'number' && !isNaN(frontmatter.topP) ? frontmatter.topP : undefined

  const note: Note = {
    id,
    title,
    content: body,
    folder,
    isFavorite,
    createdAt,
    updatedAt,
    tags,
  }

  if (emoji !== undefined) note.emoji = emoji
  if (coverImage !== undefined) note.coverImage = coverImage
  if (description !== undefined) note.description = description
  if (sources !== undefined && sources.length > 0) note.sources = sources
  if (aiInstructions !== undefined) note.aiInstructions = aiInstructions
  if (temperature !== undefined) note.temperature = temperature
  if (topP !== undefined) note.topP = topP

  return note
}

/**
 * Serializes a Note into a markdown string with YAML frontmatter.
 * Deterministic field ordering. Preserves extra fields alphabetically.
 */
export function serializeNote(note: Note, extraFields?: Record<string, unknown>): string {
  const lines: string[] = [FRONTMATTER_DELIMITER]

  // Emit known fields in deterministic order
  lines.push(`id: ${quoteYamlValue(note.id)}`)
  lines.push(`title: ${quoteYamlValue(note.title)}`)
  lines.push(`createdAt: ${quoteYamlValue(note.createdAt)}`)
  lines.push(`updatedAt: ${quoteYamlValue(note.updatedAt)}`)
  lines.push(`tags: ${serializeFlowSequence(note.tags)}`)
  lines.push(`isFavorite: ${note.isFavorite}`)

  // Optional fields — omit when undefined/null
  if (note.emoji != null) {
    lines.push(`emoji: ${quoteYamlValue(note.emoji)}`)
  }
  if (note.coverImage != null) {
    lines.push(`coverImage: ${quoteYamlValue(note.coverImage)}`)
  }
  if (note.description != null && note.description.trim().length > 0) {
    lines.push(`description: ${quoteYamlValue(note.description.trim())}`)
  }
  if (note.sources != null && note.sources.length > 0) {
    lines.push(`sources: ${serializeFlowSequence(note.sources)}`)
  }
  if (note.aiInstructions != null && note.aiInstructions.trim().length > 0) {
    lines.push(`aiInstructions: ${quoteYamlValue(note.aiInstructions)}`)
  }
  if (note.temperature != null && !isNaN(note.temperature)) {
    lines.push(`temperature: ${note.temperature}`)
  }
  if (note.topP != null && !isNaN(note.topP)) {
    lines.push(`topP: ${note.topP}`)
  }

  // Extra/unrecognized fields in alphabetical order
  if (extraFields) {
    const sortedKeys = Object.keys(extraFields).sort()
    for (const key of sortedKeys) {
      const value = extraFields[key]
      if (value !== undefined && value !== null) {
        lines.push(`${key}: ${serializeYamlValue(value)}`)
      }
    }
  }

  lines.push(FRONTMATTER_DELIMITER)

  // Body after frontmatter with separator newline
  return lines.join('\n') + '\n' + note.content
}

// --- Internal YAML parser ---

function parseYamlBlock(yaml: string): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  const lines = yaml.split('\n')

  for (const line of lines) {
    // Skip empty lines and comments
    if (line.trim() === '' || line.trim().startsWith('#')) continue

    const colonIndex = line.indexOf(':')
    if (colonIndex === -1) continue

    const key = line.slice(0, colonIndex).trim()
    const rawValue = line.slice(colonIndex + 1).trim()

    result[key] = parseYamlValue(rawValue)
  }

  return result
}

function parseYamlValue(raw: string): unknown {
  // Empty value → empty string
  if (raw === '' || raw === '~' || raw === 'null') return null

  // Boolean
  if (raw === 'true') return true
  if (raw === 'false') return false

  // Flow sequence [a, b, c]
  if (raw.startsWith('[') && raw.endsWith(']')) {
    return parseFlowSequence(raw)
  }

  // Quoted string (single or double)
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return unescapeYamlString(raw.slice(1, -1), raw[0] as '"' | "'")
  }

  // Number (integer or float)
  if (/^-?\d+(\.\d+)?$/.test(raw)) {
    return Number(raw)
  }

  // Plain string
  return raw
}

function parseFlowSequence(raw: string): string[] {
  const inner = raw.slice(1, -1).trim()
  if (inner === '') return []

  const items: string[] = []
  let current = ''
  let inQuote: '"' | "'" | null = null

  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i]!

    if (inQuote) {
      if (ch === inQuote) {
        inQuote = null
      } else {
        current += ch
      }
    } else if (ch === '"' || ch === "'") {
      inQuote = ch
    } else if (ch === ',') {
      items.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }

  const last = current.trim()
  if (last.length > 0) items.push(last)

  return items
}

function unescapeYamlString(s: string, quote: '"' | "'"): string {
  if (quote === "'") {
    // In single-quoted YAML, only '' is an escape (for literal ')
    return s.replace(/''/g, "'")
  }
  // Double-quoted: handle common escapes
  return s.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"').replace(/\\\\/g, '\\')
}

// --- Internal YAML serializer ---

function quoteYamlValue(value: string): string {
  if (value === '') return '""'

  // ISO 8601 dates are safe — they contain : but are valid unquoted YAML
  if (ISO_DATE_PATTERN.test(value)) return value

  // Check if value needs quoting
  const needsQuoting =
    YAML_SPECIAL_CHARS.test(value) ||
    value.startsWith(' ') ||
    value.endsWith(' ') ||
    value === 'true' ||
    value === 'false' ||
    value === 'null' ||
    value === '~' ||
    /^-?\d+(\.\d+)?$/.test(value)

  if (needsQuoting) {
    // Use double quotes and escape special chars
    const escaped = value
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\t/g, '\\t')
    return `"${escaped}"`
  }

  return value
}

function serializeFlowSequence(items: string[]): string {
  if (items.length === 0) return '[]'
  const serialized = items.map((item) => {
    // Quote items that contain special characters
    if (YAML_SPECIAL_CHARS.test(item) || item.includes(',') || item === '') {
      return `"${item.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
    }
    return item
  })
  return `[${serialized.join(', ')}]`
}

function serializeYamlValue(value: unknown): string {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'boolean') return String(value)
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string') return quoteYamlValue(value)
  if (Array.isArray(value)) {
    return serializeFlowSequence(value.map((v) => String(v)))
  }
  return quoteYamlValue(String(value))
}

// --- Utilities ---

function deriveTitle(filename?: string): string {
  if (!filename) return 'Untitled'
  // Strip .md extension and replace hyphens with spaces
  return filename.replace(/\.md$/i, '').replace(/-/g, ' ')
}
