import type { Note } from '@/types'
import { isTauri } from '@/utils/tauri'

/**
 * Generates a clean markdown string from a Note.
 * - Cover image as a markdown image attachment above the title
 * - Emoji prefixed to the title (e.g. "# 📝 Mi nota")
 * - No YAML frontmatter
 */
function noteToMarkdown(note: Note): string {
  const parts: string[] = []

  // Cover image as markdown attachment
  if (note.coverImage) {
    parts.push(`![${note.title}](${note.coverImage})`)
    parts.push('')
  }

  // Title with emoji prefix
  const emojiPrefix = note.emoji ? `${note.emoji} ` : ''
  parts.push(`# ${emojiPrefix}${note.title}`)
  parts.push('')

  // Content
  if (note.content) {
    parts.push(note.content)
  }

  return parts.join('\n') + '\n'
}

function getSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9áéíóúñü\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60) || 'nota'
}

/**
 * Saves a Note as a .md file using Tauri's native "Save As" dialog.
 * Falls back to browser download if not running in Tauri.
 */
async function downloadAsMarkdown(note: Note) {
  const markdown = noteToMarkdown(note)
  const defaultName = `${getSlug(note.title)}.md`

  if (isTauri()) {
    const { save } = await import('@tauri-apps/plugin-dialog')
    const { writeTextFile } = await import('@tauri-apps/plugin-fs')

    const filePath = await save({
      title: 'Guardar nota como Markdown',
      defaultPath: defaultName,
      filters: [{ name: 'Markdown', extensions: ['md'] }],
    })

    if (!filePath) return // User cancelled

    await writeTextFile(filePath, markdown)
  } else {
    // Browser fallback
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = defaultName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}

/**
 * Copies the note content as markdown to the clipboard.
 * Returns true if successful, false otherwise.
 */
async function copyAsMarkdown(note: Note): Promise<boolean> {
  const markdown = noteToMarkdown(note)
  try {
    await navigator.clipboard.writeText(markdown)
    return true
  } catch {
    return false
  }
}

export function useExport() {
  return { noteToMarkdown, downloadAsMarkdown, copyAsMarkdown }
}
