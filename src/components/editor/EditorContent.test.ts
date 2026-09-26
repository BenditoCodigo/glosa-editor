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

    // Reorder: delete second node and insert Node at position 0
    const tr = editor.state.tr
    tr.delete(posSecond, posSecond + sizeSecond)
    tr.insert(0, secondNode)
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

  it('keeps individual blocks distinct when moving multiple paragraphs without merging numbers or text', () => {
    const mdInput = `1

2

3

4

5

6`

    const editor = new Editor({
      content: mdInput,
      extensions: [
        StarterKit,
        Markdown.configure({
          html: true,
          tightLists: true,
        }),
      ],
    })

    const doc = editor.state.doc
    expect(doc.childCount).toBe(6)

    // Move block 4 (index 3, value "4") to before block 2 (index 1, value "2")
    const sourceIndex = 3
    const targetIndex = 1
    const nodeToMove = doc.child(sourceIndex)

    let sourceStart = 0
    for (let i = 0; i < sourceIndex; i++) {
      sourceStart += doc.child(i).nodeSize
    }
    const sourceEnd = sourceStart + nodeToMove.nodeSize

    const tr = editor.state.tr
    tr.delete(sourceStart, sourceEnd)

    const newTargetIndex = targetIndex > sourceIndex ? targetIndex - 1 : targetIndex
    let insertPos = 0
    for (let i = 0; i < newTargetIndex; i++) {
      insertPos += tr.doc.child(i).nodeSize
    }
    tr.insert(insertPos, nodeToMove)
    editor.view.dispatch(tr)

    // Verify all 6 blocks remain distinct
    expect(editor.state.doc.childCount).toBe(6)
    expect(editor.state.doc.child(0).textContent).toBe('1')
    expect(editor.state.doc.child(1).textContent).toBe('4')
    expect(editor.state.doc.child(2).textContent).toBe('2')
    expect(editor.state.doc.child(3).textContent).toBe('3')
    expect(editor.state.doc.child(4).textContent).toBe('5')
    expect(editor.state.doc.child(5).textContent).toBe('6')

    editor.destroy()
  })
})
