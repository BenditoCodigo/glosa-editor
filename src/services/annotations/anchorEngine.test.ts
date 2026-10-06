import { describe, it, expect } from 'vitest'
import {
  createAnnotationAnchor,
  findAnchorPosition,
  levenshteinDistance,
  stringSimilarity,
} from './anchorEngine'

describe('Anchor Engine', () => {
  describe('levenshteinDistance and stringSimilarity', () => {
    it('calculates 0 distance and 1.0 similarity for identical strings', () => {
      expect(levenshteinDistance('hola', 'hola')).toBe(0)
      expect(stringSimilarity('hola', 'hola')).toBe(1)
    })

    it('calculates single substitution distance', () => {
      expect(levenshteinDistance('gato', 'pato')).toBe(1)
      expect(stringSimilarity('gato', 'pato')).toBe(0.75)
    })

    it('calculates addition / deletion distance', () => {
      expect(levenshteinDistance('palabra', 'palabras')).toBe(1)
    })
  })

  describe('createAnnotationAnchor', () => {
    it('extracts exact text and surrounding prefix and suffix', () => {
      const doc = 'Había una vez en un pueblo lejano donde los relojes marcaban el revés.'
      const exact = 'pueblo lejano'
      const from = doc.indexOf(exact)
      const to = from + exact.length

      const anchor = createAnnotationAnchor(doc, from, to, 1)

      expect(anchor.exact).toBe('pueblo lejano')
      expect(anchor.approxStartOffset).toBe(from)
      expect(anchor.blockIndex).toBe(1)
      expect(anchor.prefix).toContain('Había una vez en un ')
      expect(anchor.suffix).toContain(' donde los relojes')
    })

    it('correctly aligns exactText when from/to has ProseMirror block offset discrepancy', () => {
      const doc = 'No soy muy inteligente o especial, me considero más como una persona curiosa.'
      const exactText = 'especial'
      // Suppose ProseMirror reports from=27 instead of real index 25
      const shiftedFrom = 27
      const shiftedTo = 35

      const anchor = createAnnotationAnchor(doc, shiftedFrom, shiftedTo, 0, exactText)

      expect(anchor.exact).toBe('especial')
      expect(anchor.approxStartOffset).toBe(doc.indexOf('especial'))
      expect(anchor.prefix).toBe(doc.slice(0, doc.indexOf('especial')))
      expect(anchor.suffix).toBe(doc.slice(doc.indexOf('especial') + 'especial'.length, doc.indexOf('especial') + 'especial'.length + 32))
    })
  })

  describe('findAnchorPosition', () => {
    it('matches exact unchanged position with 1.0 confidence', () => {
      const doc = 'El laberinto de la memoria contenía secretos inconfesables.'
      const exact = 'laberinto de la memoria'
      const from = doc.indexOf(exact)
      const to = from + exact.length

      const anchor = createAnnotationAnchor(doc, from, to)
      const result = findAnchorPosition(doc, anchor)

      expect(result.isOrphan).toBe(false)
      expect(result.from).toBe(from)
      expect(result.to).toBe(to)
      expect(result.confidence).toBe(1.0)
    })

    it('re-anchors when text is inserted before the selection (offset shifted)', () => {
      const originalDoc = 'El laberinto de la memoria contenía secretos inconfesables.'
      const exact = 'secretos inconfesables'
      const originalFrom = originalDoc.indexOf(exact)
      const originalTo = originalFrom + exact.length
      const anchor = createAnnotationAnchor(originalDoc, originalFrom, originalTo)

      // User adds two paragraphs before
      const modifiedDoc =
        'Capítulo 1.\n\nTodo empezó aquella tarde lluviosa. ' + originalDoc

      const result = findAnchorPosition(modifiedDoc, anchor)

      expect(result.isOrphan).toBe(false)
      expect(result.from).toBe(modifiedDoc.indexOf(exact))
      expect(result.to).toBe(modifiedDoc.indexOf(exact) + exact.length)
      expect(result.confidence).toBeGreaterThan(0.9)
    })

    it('disambiguates when the exact word appears multiple times using context', () => {
      const doc =
        'El sol brillaba en el cielo. Más tarde, el sol se ocultó tras la montaña.'
      // Let's annotate the second "el sol"
      const secondPos = doc.lastIndexOf('el sol')
      const anchor = createAnnotationAnchor(doc, secondPos, secondPos + 'el sol'.length)

      const result = findAnchorPosition(doc, anchor)

      expect(result.isOrphan).toBe(false)
      expect(result.from).toBe(secondPos)
      expect(result.to).toBe(secondPos + 'el sol'.length)
    })

    it('tolerates minor typos / edits in selection via fuzzy matching', () => {
      const originalDoc = 'El cronista recopiló testimonios antiguos.'
      const exact = 'testimonios antiguos'
      const from = originalDoc.indexOf(exact)
      const to = from + exact.length
      const anchor = createAnnotationAnchor(originalDoc, from, to)

      // The author edited "testimonios antiguos" -> "testimonios muy antiguos" or "testimonio antiguo"
      const modifiedDoc = 'El cronista recopiló testimonio antiguo.'
      const result = findAnchorPosition(modifiedDoc, anchor)

      expect(result.isOrphan).toBe(false)
      expect(result.exactText).toBe('testimonio antiguo')
      expect(result.confidence).toBeGreaterThan(0.7)
    })

    it('identifies deleted text as orphan', () => {
      const originalDoc = 'Había una frase que luego fue completamente eliminada del texto.'
      const exact = 'completamente eliminada'
      const from = originalDoc.indexOf(exact)
      const to = from + exact.length
      const anchor = createAnnotationAnchor(originalDoc, from, to)

      // The author deleted the whole sentence
      const modifiedDoc = 'Un nuevo párrafo completamente distinto sin nada que ver.'
      const result = findAnchorPosition(modifiedDoc, anchor)

      expect(result.isOrphan).toBe(true)
      expect(result.confidence).toBe(0)
      expect(result.from).toBe(-1)
    })
  })
})
