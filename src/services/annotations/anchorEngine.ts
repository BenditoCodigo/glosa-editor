import type { WriterAnnotationAnchor } from '@/types/note'

export interface AnchorMatchResult {
  from: number
  to: number
  exactText: string
  confidence: number
  isOrphan: boolean
}

const CONTEXT_WINDOW_SIZE = 32
const FUZZY_MIN_SIMILARITY = 0.75

/**
 * Creates an anchor descriptor containing exact text, surrounding context prefix/suffix,
 * and position offsets to survive document edits.
 */
export function createAnnotationAnchor(
  docText: string,
  from: number,
  to: number,
  blockIndex?: number,
  exactText?: string,
): WriterAnnotationAnchor {
  let safeFrom = Math.max(0, Math.min(from, docText.length))
  let safeTo = Math.max(safeFrom, Math.min(to, docText.length))
  let exact = exactText !== undefined && exactText.length > 0 ? exactText : docText.slice(safeFrom, safeTo)

  // If exactText was specified, find its true offset in docText closest to `from`
  // (accounting for ProseMirror position offsets vs string index)
  if (exactText && exactText.trim().length > 0) {
    if (docText.slice(safeFrom, safeFrom + exactText.length) === exactText) {
      safeTo = safeFrom + exactText.length
      exact = exactText
    } else {
      let bestIndex = -1
      let minDistance = Infinity
      let searchPos = 0
      while (searchPos < docText.length) {
        const found = docText.indexOf(exactText, searchPos)
        if (found === -1) break
        const dist = Math.abs(found - from)
        if (dist < minDistance) {
          minDistance = dist
          bestIndex = found
        }
        searchPos = found + 1
      }

      if (bestIndex !== -1) {
        safeFrom = bestIndex
        safeTo = bestIndex + exactText.length
        exact = exactText
      }
    }
  }

  const prefix = docText.slice(Math.max(0, safeFrom - CONTEXT_WINDOW_SIZE), safeFrom)
  const suffix = docText.slice(safeTo, Math.min(docText.length, safeTo + CONTEXT_WINDOW_SIZE))

  return {
    exact,
    prefix,
    suffix,
    approxStartOffset: safeFrom,
    blockIndex,
  }
}

/**
 * Calculates the Levenshtein distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  const row = new Array<number>(b.length + 1)
  for (let j = 0; j <= b.length; j++) {
    row[j] = j
  }

  for (let i = 1; i <= a.length; i++) {
    let prev = i - 1
    row[0] = i

    for (let j = 1; j <= b.length; j++) {
      const temp = row[j]!
      if (a[i - 1] === b[j - 1]) {
        row[j] = prev
      } else {
        row[j] = Math.min(prev + 1, row[j]! + 1, row[j - 1]! + 1)
      }
      prev = temp
    }
  }

  return row[b.length]!
}

/**
 * Calculates normalized string similarity (0 to 1).
 */
export function stringSimilarity(a: string, b: string): number {
  if (a === b) return 1
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  const distance = levenshteinDistance(a, b)
  return 1 - distance / maxLen
}

/**
 * Locates the most accurate position for an annotation anchor in the current document.
 * Uses a 4-tier resilience strategy:
 * 1. Exact match at approxStartOffset
 * 2. Full context match (prefix + exact + suffix)
 * 3. Disambiguated exact match (exact text scored by context and proximity)
 * 4. Fuzzy Levenshtein match (survives minor edits, typos, pluralizations)
 * 5. Returns isOrphan: true if text is deleted.
 */
export function findAnchorPosition(
  docText: string,
  anchor: WriterAnnotationAnchor,
): AnchorMatchResult {
  if (!anchor.exact || anchor.exact.length === 0) {
    return {
      from: -1,
      to: -1,
      exactText: '',
      confidence: 0,
      isOrphan: true,
    }
  }

  const exactLen = anchor.exact.length
  const offset = anchor.approxStartOffset

  // 1. Exact match at original offset
  if (
    offset >= 0 &&
    offset + exactLen <= docText.length &&
    docText.slice(offset, offset + exactLen) === anchor.exact
  ) {
    return {
      from: offset,
      to: offset + exactLen,
      exactText: anchor.exact,
      confidence: 1.0,
      isOrphan: false,
    }
  }

  // 2. Full context search (prefix + exact + suffix)
  if (anchor.prefix && anchor.suffix) {
    const fullContext = anchor.prefix + anchor.exact + anchor.suffix
    const fullIndex = docText.indexOf(fullContext)
    if (fullIndex !== -1) {
      const from = fullIndex + anchor.prefix.length
      const to = from + exactLen
      return {
        from,
        to,
        exactText: anchor.exact,
        confidence: 0.98,
        isOrphan: false,
      }
    }
  }

  // 3. Exact string search anywhere in doc, disambiguated by prefix/suffix/distance
  const occurrences: number[] = []
  let searchPos = 0
  while (true) {
    const foundPos = docText.indexOf(anchor.exact, searchPos)
    if (foundPos === -1) break
    occurrences.push(foundPos)
    searchPos = foundPos + 1
  }

  if (occurrences.length === 1) {
    const from = occurrences[0]!
    const to = from + exactLen
    return {
      from,
      to,
      exactText: anchor.exact,
      confidence: 0.95,
      isOrphan: false,
    }
  }

  if (occurrences.length > 1) {
    let bestPos = occurrences[0]!
    let bestScore = -1

    for (const pos of occurrences) {
      const docPrefix = docText.slice(Math.max(0, pos - anchor.prefix.length), pos)
      const docSuffix = docText.slice(pos + exactLen, pos + exactLen + anchor.suffix.length)

      const prefixScore = anchor.prefix ? stringSimilarity(docPrefix, anchor.prefix) : 0.5
      const suffixScore = anchor.suffix ? stringSimilarity(docSuffix, anchor.suffix) : 0.5

      // Distance penalty (closer to approxStartOffset scores higher)
      const dist = Math.abs(pos - offset)
      const distanceFactor = Math.max(0, 1 - dist / Math.max(1000, docText.length))

      const totalScore = prefixScore * 0.4 + suffixScore * 0.4 + distanceFactor * 0.2

      if (totalScore > bestScore) {
        bestScore = totalScore
        bestPos = pos
      }
    }

    return {
      from: bestPos,
      to: bestPos + exactLen,
      exactText: anchor.exact,
      confidence: Math.max(0.85, bestScore),
      isOrphan: false,
    }
  }

  // 4. Fuzzy search for edited/mutated text around approxStartOffset
  // Search window: around approxStartOffset +/- 300 chars, or whole document if short
  const searchStart = Math.max(0, offset - 300)
  const searchEnd = Math.min(docText.length, offset + exactLen + 300)
  const windowText = docText.slice(searchStart, searchEnd)

  let bestFuzzySimilarity = 0
  let bestFuzzyFrom = -1
  let bestFuzzyTo = -1

  // Candidate lengths to try: exactLen - 5 to exactLen + 5
  const minLen = Math.max(1, exactLen - 5)
  const maxLen = Math.min(windowText.length, exactLen + 5)

  for (let len = minLen; len <= maxLen; len++) {
    for (let i = 0; i <= windowText.length - len; i++) {
      const candidate = windowText.slice(i, i + len)
      const sim = stringSimilarity(candidate, anchor.exact)
      if (sim > bestFuzzySimilarity) {
        bestFuzzySimilarity = sim
        bestFuzzyFrom = searchStart + i
        bestFuzzyTo = searchStart + i + len
      }
    }
  }

  if (bestFuzzySimilarity >= FUZZY_MIN_SIMILARITY) {
    return {
      from: bestFuzzyFrom,
      to: bestFuzzyTo,
      exactText: docText.slice(bestFuzzyFrom, bestFuzzyTo),
      confidence: Number((bestFuzzySimilarity * 0.9).toFixed(2)),
      isOrphan: false,
    }
  }

  // 5. Unrecoverable / Deleted text -> Mark as Orphan
  return {
    from: -1,
    to: -1,
    exactText: anchor.exact,
    confidence: 0,
    isOrphan: true,
  }
}
