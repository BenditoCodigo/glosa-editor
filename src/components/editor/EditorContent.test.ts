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

    const mdOutput = (editor.storage as any).markdown.getMarkdown()
    expect(mdOutput.trim()).toBe(mdInput)

    editor.destroy()
  })
})
