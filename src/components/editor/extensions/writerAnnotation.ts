import { Mark, mergeAttributes } from '@tiptap/core'
import type { WriterAnnotationColor } from '@/types/note'

export interface WriterAnnotationOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    writerAnnotation: {
      setWriterAnnotation: (attributes: {
        annotationId: string
        color?: WriterAnnotationColor
        resolved?: boolean
      }) => ReturnType
      unsetWriterAnnotation: (annotationId?: string) => ReturnType
    }
  }
}

export const WriterAnnotationMark = Mark.create<WriterAnnotationOptions>({
  name: 'writerAnnotation',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      annotationId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-annotation-id'),
        renderHTML: (attributes) => {
          if (!attributes.annotationId) return {}
          return { 'data-annotation-id': attributes.annotationId }
        },
      },
      color: {
        default: 'amber',
        parseHTML: (element) => element.getAttribute('data-annotation-color') || 'amber',
        renderHTML: (attributes) => ({
          'data-annotation-color': attributes.color || 'amber',
        }),
      },
      resolved: {
        default: false,
        parseHTML: (element) => element.getAttribute('data-annotation-resolved') === 'true',
        renderHTML: (attributes) => ({
          'data-annotation-resolved': attributes.resolved ? 'true' : 'false',
        }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'mark[data-annotation-id]',
      },
      {
        tag: 'span[data-annotation-id]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const color = (HTMLAttributes['data-annotation-color'] as string) || 'amber'
    const resolved = HTMLAttributes['data-annotation-resolved'] === 'true'

    const colorClasses: Record<string, string> = {
      amber: resolved
        ? 'bg-amber-500/10 text-amber-900/60 dark:text-amber-200/60 border-b border-amber-500/30'
        : 'bg-amber-500/20 text-amber-900 dark:text-amber-100 border-b-2 border-amber-500/70 hover:bg-amber-500/30',
      emerald: resolved
        ? 'bg-emerald-500/10 text-emerald-900/60 dark:text-emerald-200/60 border-b border-emerald-500/30'
        : 'bg-emerald-500/20 text-emerald-900 dark:text-emerald-100 border-b-2 border-emerald-500/70 hover:bg-emerald-500/30',
      rose: resolved
        ? 'bg-rose-500/10 text-rose-900/60 dark:text-rose-200/60 border-b border-rose-500/30'
        : 'bg-rose-500/20 text-rose-900 dark:text-rose-100 border-b-2 border-rose-500/70 hover:bg-rose-500/30',
      indigo: resolved
        ? 'bg-indigo-500/10 text-indigo-900/60 dark:text-indigo-200/60 border-b border-indigo-500/30'
        : 'bg-indigo-500/20 text-indigo-900 dark:text-indigo-100 border-b-2 border-indigo-500/70 hover:bg-indigo-500/30',
      purple: resolved
        ? 'bg-purple-500/10 text-purple-900/60 dark:text-purple-200/60 border-b border-purple-500/30'
        : 'bg-purple-500/20 text-purple-900 dark:text-purple-100 border-b-2 border-purple-500/70 hover:bg-purple-500/30',
    }

    const cls = colorClasses[color] || colorClasses.amber

    return [
      'mark',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: `writer-annotation cursor-pointer rounded px-0.5 py-0.5 transition-colors duration-150 ${cls}`,
      }),
      0,
    ]
  },

  addCommands() {
    return {
      setWriterAnnotation:
        (attributes) =>
        ({ chain }) => {
          return chain().setMark(this.name, attributes).run()
        },
      unsetWriterAnnotation:
        (_annotationId) =>
        ({ chain }) => {
          return chain().unsetMark(this.name).run()
        },
    }
  },
})
