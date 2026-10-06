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

// Pre-allocated rows for fast Levenshtein without GC pressure
let prevRow = new Int32Array(256)
let currRow = new Int32Array(256)

/**
 * Calculates the Levenshtein distance between two strings with early-exit.
 */
export function levenshteinDistance(a: string, b: string, maxDistance = Infinity): number {
  if (a === b) return 0
  const aLen = a.length
  const bLen = b.length
  if (aLen === 0) return bLen
  if (bLen === 0) return aLen
  if (Math.abs(aLen - bLen) > maxDistance) return maxDistance + 1

  if (bLen + 1 > prevRow.length) {
    prevRow = new Int32Array(bLen + 128)
    currRow = new Int32Array(bLen + 128)
  }

  for (let j = 0; j <= bLen; j++) {
    prevRow[j] = j
  }

  for (let i = 1; i <= aLen; i++) {
    currRow[0] = i
    const aChar = a[i - 1]
    let minRowVal = currRow[0]

    for (let j = 1; j <= bLen; j++) {
      const cost = aChar === b[j - 1] ? 0 : 1
      const val = Math.min(
        prevRow[j]! + 1,      // deletion
        currRow[j - 1]! + 1,  // insertion
        prevRow[j - 1]! + cost // substitution
      )
      currRow[j] = val
      if (val < minRowVal) minRowVal = val
    }

    if (minRowVal > maxDistance) return maxDistance + 1

    // Swap row buffers
    const temp = prevRow
    prevRow = currRow
    currRow = temp
  }

  return prevRow[bLen]!
}

/**
 * Calculates normalized string similarity (0 to 1).
 */
export function stringSimilarity(a: string, b: string): number {
  if (a === b) return 1
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  const maxAllowedDist = Math.floor(maxLen * (1 - FUZZY_MIN_SIMILARITY)) + 1
  const distance = levenshteinDistance(a, b, maxAllowedDist)
  if (distance > maxAllowedDist) return 0
  return 1 - distance / maxLen
}

/**
 * Locates the most accurate position for an annotation anchor in the current document.
 * Uses a 4-tier resilience strategy:
 * 1. Exact match at approxStartOffset
 * 2. Full context match (prefix + exact + suffix)
 * 3. Disambiguated exact match (exact text scored by context and proximity)
 * 4. Fast sub-anchor / fuzzy match (survives minor edits, typos, pluralizations)
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
    if (occurrences.length > 50) break // safety cap
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

  // 4. Fast sub-anchor / fuzzy search for edited or mutated text
  // If text is long (> 60 chars, e.g. whole block), match via anchor head and tail sub-strings
  if (exactLen > 60) {
    const head = anchor.exact.slice(0, 30)
    const headPos = docText.indexOf(head)
    if (headPos !== -1) {
      return {
        from: headPos,
        to: Math.min(docText.length, headPos + exactLen),
        exactText: docText.slice(headPos, Math.min(docText.length, headPos + exactLen)),
        confidence: 0.9,
        isOrphan: false,
      }
    }
    const tail = anchor.exact.slice(-30)
    const tailPos = docText.indexOf(tail)
    if (tailPos !== -1) {
      const from = Math.max(0, tailPos - exactLen + 30)
      return {
        from,
        to: tailPos + 30,
        exactText: docText.slice(from, tailPos + 30),
        confidence: 0.85,
        isOrphan: false,
      }
    }
  } else {
    // For short text phrases, run targeted fuzzy search in bounded proximity window
    const searchStart = Math.max(0, offset - 150)
    const searchEnd = Math.min(docText.length, offset + exactLen + 150)
    const windowText = docText.slice(searchStart, searchEnd)

    let bestFuzzySimilarity = 0
    let bestFuzzyFrom = -1
    let bestFuzzyTo = -1

    const minLen = Math.max(1, exactLen - 3)
    const maxLen = Math.min(windowText.length, exactLen + 3)

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
