import { describe, it, expect } from 'vitest'
import { renderMarkdown } from './markdown'

describe('renderMarkdown', () => {
  it('handles empty or blank string', () => {
    expect(renderMarkdown('')).toBe('')
    expect(renderMarkdown('   ')).toBe('')
  })

  it('renders bold and italic correctly', () => {
    const input = 'Texto con **negrita** y *cursiva*.'
    const html = renderMarkdown(input)
    expect(html).toContain('<strong class="font-semibold text-on-surface">negrita</strong>')
    expect(html).toContain('<em class="italic text-on-surface/90">cursiva</em>')
  })

  it('renders unordered list with bullets', () => {
    const input = `**Sugerencias:**\n\n* Primera duda\n* Segunda duda`
    const html = renderMarkdown(input)
    expect(html).toContain('<ul class="list-disc')
    expect(html).toContain('<li>Primera duda</li>')
    expect(html).toContain('<li>Segunda duda</li>')
  })

  it('renders ordered list with numbers', () => {
    const input = `1. Paso uno\n2. Paso dos`
    const html = renderMarkdown(input)
    expect(html).toContain('<ol class="list-decimal')
    expect(html).toContain('<li>Paso uno</li>')
    expect(html).toContain('<li>Paso dos</li>')
  })

  it('renders headings cleanly', () => {
    const input = `# Título 1\n## Título 2\n### Título 3`
    const html = renderMarkdown(input)
    expect(html).toContain('<h2 class="font-bold')
    expect(html).toContain('<h3 class="font-bold')
    expect(html).toContain('<h4 class="font-semibold')
  })

  it('renders inline code and code blocks', () => {
    const input = 'Usa `ollama run` para iniciar.\n\n```json\n{"status": "ok"}\n```'
    const html = renderMarkdown(input)
    expect(html).toContain('<code class="px-1.5 py-0.5 rounded')
    expect(html).toContain('ollama run')
    expect(html).toContain('<pre')
    expect(html).toContain('status')
  })

  it('sanitizes raw html tags to avoid XSS', () => {
    const input = '<script>alert("hack")</script>'
    const html = renderMarkdown(input)
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })
})
