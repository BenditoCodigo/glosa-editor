/**
 * Lightweight, safe markdown-to-HTML parser for formatted display of AI responses.
 * Sanitizes input HTML before applying markdown formatting.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function parseInline(text: string): string {
  let result = text

  // Inline code: `code`
  result = result.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 font-mono text-xs text-primary font-medium">$1</code>')

  // Bold + Italic: ***text*** or ___text___
  result = result.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong class="font-semibold text-on-surface"><em>$1</em></strong>')
  result = result.replace(/___([^_]+)___/g, '<strong class="font-semibold text-on-surface"><em>$1</em></strong>')

  // Bold: **text** or __text__
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-on-surface">$1</strong>')
  result = result.replace(/__([^_]+)__/g, '<strong class="font-semibold text-on-surface">$1</strong>')

  // Italic: *text* or _text_ (when not part of a list or bold)
  result = result.replace(/(^|[^\w*])\*([^*]+)\*([^\w*]|$)/g, '$1<em class="italic text-on-surface/90">$2</em>$3')
  result = result.replace(/(^|[^\w_])_([^_]+)_([^\w_]|$)/g, '$1<em class="italic text-on-surface/90">$2</em>$3')

  // Strikethrough: ~~text~~
  result = result.replace(/~~([^~]+)~~/g, '<del class="opacity-60">$1</del>')

  return result
}

export function renderMarkdown(markdown: string): string {
  if (!markdown || !markdown.trim()) return ''

  // 1. Sanitize raw HTML characters first to prevent XSS
  const sanitized = escapeHtml(markdown)

  // 2. Separate into code blocks and normal text blocks
  const codeBlocks: string[] = []
  const textWithPlaceholders = sanitized.replace(/```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const codeId = `__CODE_BLOCK_${codeBlocks.length}__`
    const langBadge = lang ? `<span class="text-[10px] text-secondary/60 uppercase tracking-wider font-mono block mb-1">${lang}</span>` : ''
    codeBlocks.push(
      `<pre class="my-2 p-3 rounded-lg bg-black/10 dark:bg-white/5 font-mono text-xs text-on-surface overflow-x-auto border border-outline-variant/30">${langBadge}<code>${code.trim()}</code></pre>`
    )
    return `\n\n${codeId}\n\n`
  })

  // 3. Process line by line for block-level elements
  const rawLines = textWithPlaceholders.split('\n')
  const outputBlocks: string[] = []
  let inUnorderedList = false
  let inOrderedList = false
  let currentListItems: string[] = []

  function flushList() {
    if (inUnorderedList && currentListItems.length > 0) {
      outputBlocks.push(
        `<ul class="list-disc list-outside ml-4 space-y-1.5 my-2 text-on-surface/90">${currentListItems.join('')}</ul>`
      )
      currentListItems = []
      inUnorderedList = false
    } else if (inOrderedList && currentListItems.length > 0) {
      outputBlocks.push(
        `<ol class="list-decimal list-outside ml-4 space-y-1.5 my-2 text-on-surface/90">${currentListItems.join('')}</ol>`
      )
      currentListItems = []
      inOrderedList = false
    }
  }

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i] ?? ''
    const trimmed = line.trim()

    // Check code block placeholder
    if (trimmed.startsWith('__CODE_BLOCK_') && trimmed.endsWith('__')) {
      flushList()
      const index = parseInt(trimmed.replace(/__CODE_BLOCK_|__/g, ''), 10)
      if (codeBlocks[index]) {
        outputBlocks.push(codeBlocks[index]!)
      }
      continue
    }

    // Empty line
    if (!trimmed) {
      flushList()
      continue
    }

    // Unordered List item: `* `, `- `, `+ `
    const unorderedMatch = line.match(/^(\s*)[*+-]\s+(.*)$/)
    if (unorderedMatch) {
      if (inOrderedList) flushList()
      inUnorderedList = true
      currentListItems.push(`<li>${parseInline(unorderedMatch[2]!)}</li>`)
      continue
    }

    // Ordered List item: `1. `, `2. `
    const orderedMatch = line.match(/^(\s*)\d+\.\s+(.*)$/)
    if (orderedMatch) {
      if (inUnorderedList) flushList()
      inOrderedList = true
      currentListItems.push(`<li>${parseInline(orderedMatch[2]!)}</li>`)
      continue
    }

    // If we were in a list and hit non-list line, flush
    flushList()

    // Headings: `#`, `##`, `###`, `####`
    if (trimmed.startsWith('#### ')) {
      outputBlocks.push(`<h5 class="font-semibold text-xs text-on-surface mt-3 mb-1 uppercase tracking-wide">${parseInline(trimmed.slice(5))}</h5>`)
      continue
    }
    if (trimmed.startsWith('### ')) {
      outputBlocks.push(`<h4 class="font-semibold text-sm text-on-surface mt-3 mb-1.5">${parseInline(trimmed.slice(4))}</h4>`)
      continue
    }
    if (trimmed.startsWith('## ')) {
      outputBlocks.push(`<h3 class="font-bold text-base text-on-surface mt-3.5 mb-1.5">${parseInline(trimmed.slice(3))}</h3>`)
      continue
    }
    if (trimmed.startsWith('# ')) {
      outputBlocks.push(`<h2 class="font-bold text-lg text-on-surface mt-4 mb-2">${parseInline(trimmed.slice(2))}</h2>`)
      continue
    }

    // Blockquote: `> `
    if (trimmed.startsWith('&gt; ') || trimmed.startsWith('> ')) {
      const quoteText = trimmed.replace(/^(&gt;|>)\s*/, '')
      outputBlocks.push(
        `<blockquote class="border-l-2 border-primary/50 pl-3 my-2 text-secondary italic">${parseInline(quoteText)}</blockquote>`
      )
      continue
    }

    // Regular paragraph
    outputBlocks.push(`<p class="my-1.5 text-on-surface/90 leading-relaxed">${parseInline(trimmed)}</p>`)
  }

  flushList()

  return outputBlocks.join('')
}
