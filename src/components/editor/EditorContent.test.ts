import { describe, it, expect } from 'vitest'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Markdown } from 'tiptap-markdown'

describe('Tiptap Markdown with TaskList and Link', () => {
  it('correctly parses and serializes links inside task items', () => {
    const mdInput = '- [ ] [Calentador Eléctrico Calorex](https://www.homedepot.com.mx/p/calentador)'

    const editor = new Editor({
      content: mdInput,
      extensions: [
        StarterKit.configure({
          codeBlock: false,
        }),
        Link.configure({
          openOnClick: true,
          HTMLAttributes: {
            target: '_blank',
            rel: 'noopener noreferrer',
          },
        }),
        TaskList,
        TaskItem.configure({
          nested: true,
        }),
        Markdown.configure({
          html: true,
          tightLists: true,
          bulletListMarker: '-',
        }),
      ],
    })

    const html = editor.getHTML()
    expect(html).toContain('<a')
    expect(html).toContain('href="https://www.homedepot.com.mx/p/calentador"')
    expect(html).toContain('Calentador Eléctrico Calorex')

    interface MarkdownStorage { markdown: { getMarkdown: () => string } }
    const mdOutput = (editor.storage as unknown as MarkdownStorage).markdown.getMarkdown()
    expect(mdOutput.trim()).toBe(mdInput)

    editor.destroy()
  })

  it('correctly moves a block to a new position and serializes to markdown', () => {
    const mdInput = `# Bloque 1

Segundo párrafo de texto

- Lista elemento 1
- Lista elemento 2`

    const editor = new Editor({
      content: mdInput,
      extensions: [
        StarterKit,
        Markdown.configure({
          html: true,
          tightLists: true,
          bulletListMarker: '-',
        }),
      ],
    })

    // Find the second top-level node (paragraph) and move it before the first node (heading)
    const doc = editor.state.doc
    expect(doc.childCount).toBe(3)

    const firstNode = doc.child(0)
    const secondNode = doc.child(1)

    const posSecond = firstNode.nodeSize // start pos of 2nd node
    const sizeSecond = secondNode.nodeSize

    const slice = doc.slice(posSecond, posSecond + sizeSecond)

    // Reorder: delete second node and insert at position 0
    const tr = editor.state.tr
    tr.delete(posSecond, posSecond + sizeSecond)
    tr.insert(0, slice.content)
    editor.view.dispatch(tr)

    interface MarkdownStorage { markdown: { getMarkdown: () => string } }
    const mdOutput = (editor.storage as unknown as MarkdownStorage).markdown.getMarkdown()
    expect(mdOutput).toContain('Segundo párrafo de texto')
    // Check that paragraph now comes before heading
    const pIndex = mdOutput.indexOf('Segundo párrafo de texto')
    const hIndex = mdOutput.indexOf('# Bloque 1')
    expect(pIndex).toBeLessThan(hIndex)

    editor.destroy()
  })
})
