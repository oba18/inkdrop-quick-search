import type {
  HighlightMarkPosition,
  TelescopeContext,
  TelescopeResult,
  TelescopeSourceItem
} from '@inkdropapp/types'
import { TelescopeSource } from 'inkdrop'
import { createElement } from 'react'
import type { Note } from 'inkdrop-model'

import { Accessory, type TagView } from './accessory'
import { getConfig, getEnv } from './env'
import { stripMarkers, taskInfo } from './task-info'
import { tr } from './i18n'

export const SOURCE_ID = 'quick-search-notes'

const NOTE_ICON =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M8 13h8"/><path d="M8 17h5"/></svg>'

/** How many characters of the matched line to keep before the hit */
const SNIPPET_BEFORE = 20
const SNIPPET_LENGTH = 90

interface TitleEntry {
  id: string
  title: string
  lower: string
  bookId: string
  updatedAt: number
}

type HitNote = Pick<Note, '_id' | 'title' | 'bookId' | 'updatedAt'> & Partial<Pick<Note, 'body' | 'tags' | 'status'>>

interface Hit {
  /** Title-only hits start without `body`/`tags`; `withDocs` fills them in */
  note: HitNote
  /** Lower is better: see `titleTier` */
  tier: number
  /** Position in the full-text results, `Infinity` for title-only hits */
  ftsRank: number
  bodyHighlights: HighlightMarkPosition[]
  /** Title highlight ranges for `getMatch` */
  ranges: number[]
}

/** Splits the query into words; Inkdrop's search also ANDs space-separated words. */
function queryWords(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean)
}

/**
 * 0: title is the query, 1: title starts with it, 2: title contains every word,
 * 3: matched in the title by full-text search only, 4: matched in the body only.
 */
function titleTier(lowerTitle: string, query: string, words: string[]): number | null {
  const q = query.toLowerCase()
  if (lowerTitle === q) return 0
  if (lowerTitle.startsWith(q)) return 1
  if (words.every(w => lowerTitle.includes(w))) return 2
  return null
}

/** `[from, to, from, to, …]` ranges of the query words in the title, merged */
function titleRanges(title: string, words: string[], fts: HighlightMarkPosition[]): number[] {
  const lower = title.toLowerCase()
  const spans: [number, number][] = fts.map(h => [h.offStart, h.offEnd])
  for (const w of words) {
    for (let i = lower.indexOf(w); i >= 0; i = lower.indexOf(w, i + w.length)) spans.push([i, i + w.length])
  }
  spans.sort((a, b) => a[0] - b[0])
  const out: number[] = []
  for (const [from, to] of spans) {
    if (out.length && from <= out[out.length - 1]) out[out.length - 1] = Math.max(out[out.length - 1], to)
    else out.push(from, to)
  }
  return out
}

/** Task lines and due-date lines, whose reminder markers the row shows separately */
const MARKED_LINE_RE = /^\s*(?:[-*+]|\d+[.)])\s+\[[ xX]\]|⏰/

/** A body line as plain text: no list/heading markers, link targets or inline markup */
function plainLine(line: string): string {
  return (MARKED_LINE_RE.test(line) ? stripMarkers(line) : line)
    .replace(/^\s*(?:#{1,6}\s|[-*+]\s(?:\[[ xX]\]\s)?|\d+\.\s|>\s?)/, '')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[`*_~]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * The first matched body line that isn't just the title (notes often start
 * with `# <title>`), cut around the first query word, and its line number.
 */
function snippet(
  body: string | undefined,
  highlights: HighlightMarkPosition[],
  words: string[],
  title: string
): { text: string; line: number } {
  const none = { text: '', line: -1 }
  if (!body || !highlights.length) return none
  const lines = body.split('\n')
  const lowerTitle = title.trim().toLowerCase()
  for (const h of highlights) {
    const text = plainLine(lines[h.line] ?? '')
    if (!text || text.toLowerCase() === lowerTitle) continue
    const lower = text.toLowerCase()
    const hit = Math.min(...words.map(w => lower.indexOf(w)).filter(i => i >= 0))
    const start = Number.isFinite(hit) ? Math.max(0, hit - SNIPPET_BEFORE) : 0
    return { text: (start > 0 ? '…' : '') + text.slice(start, start + SNIPPET_LENGTH), line: h.line }
  }
  return none
}

/**
 * A Telescope source that finds notes by title and full text. Titles come
 * from an in-memory cache (substring match, so mid-word hits work too) and
 * bodies from Inkdrop's full-text index; title hits are ranked first.
 */
export class NoteSource extends TelescopeSource {
  id = SOURCE_ID
  name = 'Notes'
  description = tr('Search notes by title and full text', 'ノートをタイトルと全文で検索')
  defaultAlias = 'n'

  private titles: TitleEntry[] | null = null
  private loadingTitles: Promise<TitleEntry[]> | null = null

  /** Drops the title cache; it is rebuilt on the next search. */
  invalidate() {
    this.titles = null
    this.loadingTitles = null
  }

  /** Unlike an item's `icon`, a source icon string is rendered as text, so wrap the SVG. */
  getIcon() {
    return createElement('span', { dangerouslySetInnerHTML: { __html: NOTE_ICON } })
  }

  private async loadTitles(): Promise<TitleEntry[]> {
    if (this.titles) return this.titles
    const loading = (this.loadingTitles ??= (async () => {
      // `all()` is "All Notes", which leaves out completed and dropped notes; full-text search doesn't.
      const { notes } = getEnv().localDB as any
      const results: any[] = await Promise.all([
        notes.all({ limit: false }),
        notes.findWithStatus('completed', { limit: false }),
        notes.findWithStatus('dropped', { limit: false })
      ])
      return results.flatMap(res => res.rows).map(({ doc }: { doc: Note }) => ({
        id: doc._id,
        title: doc.title,
        lower: (doc.title || '').toLowerCase(),
        bookId: doc.bookId,
        updatedAt: doc.updatedAt
      }))
    })())
    const titles = await loading
    // A note change during the load invalidated it; still use it for this query.
    if (this.loadingTitles === loading) this.titles = titles
    return titles
  }

  /** Notebook ids to leave out: the configured notebooks, their descendants and the trash. */
  private excludedBookIds(): Set<string> {
    const names = getConfig().excludeNotebooks
    const hash: Record<string, { name: string; parentBookId?: string | null }> =
      getEnv().store.getState().books?.hash ?? {}
    const excluded = new Set<string>(['trash'])
    if (!names.length) return excluded
    for (const [id, book] of Object.entries(hash)) {
      for (let b: typeof book | undefined = book, guard = 0; b && guard < 32; guard++) {
        if (names.includes(b.name)) {
          excluded.add(id)
          break
        }
        b = b.parentBookId ? hash[b.parentBookId] : undefined
      }
    }
    return excluded
  }

  private async recent(limit: number, excluded: Set<string>): Promise<Hit[]> {
    const res: any = await getEnv().localDB.notes.all({ limit: limit * 2, sort: [{ updatedAt: 'desc' }] })
    return res.rows
      .map(({ doc }: { doc: Note }) => ({ note: doc, tier: 0, ftsRank: 0, bodyHighlights: [], ranges: [] }))
      .filter((h: Hit) => !excluded.has(h.note.bookId))
      .slice(0, limit)
  }

  private async search(query: string, limit: number, excluded: Set<string>): Promise<Hit[]> {
    const words = queryWords(query)
    const [fts, titles] = await Promise.all([
      getEnv()
        .localDB.utils.search(query, { limit: limit * 2, highlightMatches: true })
        .catch(() => null),
      this.loadTitles()
    ])

    const hits = new Map<string, Hit>()
    fts?.rows.forEach((row: any, i: number) => {
      const note = row.doc as Note
      if (excluded.has(note.bookId)) return
      const hl = row.extra?.fts
      const tier = titleTier((note.title || '').toLowerCase(), query, words) ?? (hl?.titleHighlights.length ? 3 : 4)
      hits.set(note._id, {
        note,
        tier,
        ftsRank: i,
        bodyHighlights: hl?.bodyHighlights ?? [],
        ranges: titleRanges(note.title || '', words, hl?.titleHighlights ?? [])
      })
    })
    for (const t of titles) {
      if (hits.has(t.id) || excluded.has(t.bookId)) continue
      const tier = titleTier(t.lower, query, words)
      if (tier === null) continue
      hits.set(t.id, {
        note: { _id: t.id, title: t.title, bookId: t.bookId, updatedAt: t.updatedAt },
        tier,
        ftsRank: Infinity,
        bodyHighlights: [],
        ranges: titleRanges(t.title, words, [])
      })
    }

    return [...hits.values()]
      .sort(
        (a, b) =>
          a.tier - b.tier ||
          // Title hits: most recently edited first; body hits: by relevance.
          (a.tier <= 2 ? b.note.updatedAt - a.note.updatedAt : a.ftsRank - b.ftsRank)
      )
      .slice(0, limit)
  }

  /** Loads the full documents of title-only hits, which need their body and tags for display. */
  private async withDocs(hits: Hit[]): Promise<Hit[]> {
    const missing = hits.filter(h => h.note.body === undefined).map(h => h.note._id)
    if (!missing.length) return hits
    const docs = await getEnv().localDB.notes.get(missing).catch(() => [] as Note[])
    const byId = new Map(docs.map(d => [d._id, d]))
    return hits.map(h => (byId.has(h.note._id) ? { ...h, note: byId.get(h.note._id)! } : h))
  }

  async getItems(context: TelescopeContext): Promise<TelescopeResult> {
    const query = context.query.trim()
    const words = queryWords(query)
    const { maxResults } = getConfig()
    const excluded = this.excludedBookIds()
    const found = query ? await this.search(query, maxResults, excluded) : await this.recent(maxResults, excluded)
    if (context.aborted) return { options: [] }
    const hits = await this.withDocs(found)
    if (context.aborted) return { options: [] }

    const state = getEnv().store.getState()
    const books: Record<string, { name: string }> = state.books?.hash ?? {}
    const tagHash: Record<string, TagView> = state.tags?.hash ?? {}
    const ranges = new Map(hits.map(h => [h.note._id, h.ranges]))
    const options: TelescopeSourceItem[] = hits.map(({ note, bodyHighlights }) => {
      const title = note.title || tr('Untitled', '無題')
      const match = snippet(note.body, bodyHighlights, words, title)
      const tags = (note.tags ?? []).flatMap(id => (tagHash[id] ? [tagHash[id]] : []))
      const task = taskInfo(note.body, match.line)
      // A finished note's due date is no longer overdue.
      if (task && (note.status === 'completed' || note.status === 'dropped')) task.done = true
      return {
        id: note._id,
        source: SOURCE_ID,
        type: books[note.bookId]?.name ?? '',
        label: title,
        displayLabel: title,
        detail: match.text,
        icon: NOTE_ICON,
        accessoryView: tags.length || task ? () => createElement(Accessory, { tags, task }) : undefined,
        actions: [
          { type: 'open', label: tr('Open note', 'ノートを開く') },
          { type: 'open-window', label: tr('Open in new window', '別ウィンドウで開く'), modifierKeys: ['cmd-or-ctrl' as any] },
          { type: 'copy-link', label: tr('Copy link', 'リンクをコピー'), modifierKeys: ['shift' as any] }
        ]
      }
    })
    return { options, filter: false, getMatch: item => ranges.get(item.id) ?? [] }
  }

  apply(item: TelescopeSourceItem, action: string): boolean {
    const { commands } = getEnv()
    const noteId = item.id
    switch (action) {
      case 'open-window':
        commands.dispatch(document.body, 'core:open-note-in-separate-window', { noteId })
        break
      case 'copy-link':
        commands.dispatch(document.body, 'core:copy-note-link', { noteId })
        break
      default:
        commands.dispatch(document.body, 'core:open-note', { noteId })
    }
    return true
  }
}
