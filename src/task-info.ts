import { lang } from './i18n'

/**
 * Reads the due dates and priorities written by the reminder plugin
 * (`~/dev/inkdrop-reminder`, see its `src/parse.ts`):
 *
 *   - [ ] 見積書を送る ⭐⭐ ⏰2026-10-20 15:00 🔔30m
 *   ⏰2026-10-20 15:00              ← a line of only markers: the note's due date
 *
 * Only the parts needed for display are mirrored here.
 */

const TASK_RE = /^\s*(?:[-*+]|\d+[.)])\s+\[([ xX])\]\s*(.*)$/
const DUE_RE =
  /⏰\s?(\d{4}-\d{2}-\d{2})(?:[ T](\d{1,2}:\d{2}))?(?:\s?[〜~]\s?(\d{4}-\d{2}-\d{2})(?:[ T](\d{1,2}:\d{2}))?)?/
const MARKERS_RE = new RegExp(
  `${DUE_RE.source}|🔔\\s?(?:\\d+\\s?[mhd]|off)|🏃(?:\\u200D[♀♂]\\uFE0F?)?\\uFE0F?|(?:⭐\\uFE0F?){1,3}`,
  'gu'
)
const PRIORITY_RE = /(?:⭐️?){1,3}/u

export interface Due {
  /** YYYY-MM-DD; for a period (`⏰<start>〜<end>`) its end */
  date: string
  time: string | null
  /** Start date of a period */
  start: string | null
}

export interface TaskInfo {
  due: Due | null
  /** 0 = none, 1–3 = number of ⭐ */
  priority: number
  /** The shown due date belongs to a checked task, so it can't be overdue */
  done: boolean
}

/** Removes the due/reminder/in-progress/priority markers, which the row shows separately */
export function stripMarkers(text: string): string {
  return text.replace(MARKERS_RE, '')
}

function parseDue(content: string): Due | null {
  const m = DUE_RE.exec(content)
  if (!m) return null
  return m[3] ? { date: m[3], time: m[4] ?? null, start: m[1] } : { date: m[1], time: m[2] ?? null, start: null }
}

function parsePriority(content: string): number {
  const m = PRIORITY_RE.exec(content)
  return m ? Math.min(3, m[0].replace(/️/g, '').length) : 0
}

function dueKey(d: Due): string {
  return `${d.date} ${d.time ?? '99:99'}`
}

/**
 * The task info to show for a note. When the search hit is on a task line,
 * that task's; otherwise the note's due date (or the earliest one among its
 * open tasks) and the highest priority among its open tasks.
 */
export function taskInfo(body: string | undefined, matchedLine: number): TaskInfo | null {
  if (!body || (!body.includes('⏰') && !body.includes('⭐'))) return null
  const lines = body.split('\n')

  const matched = TASK_RE.exec(lines[matchedLine] ?? '')
  if (matched) {
    const due = parseDue(matched[2])
    const priority = parsePriority(matched[2])
    if (due || priority) return { due, priority, done: matched[1] !== ' ' }
  }

  let noteDue: Due | null = null
  let earliest: Due | null = null
  let priority = 0
  let inFence = false
  for (const raw of lines) {
    if (/^\s*(```|~~~)/.test(raw)) inFence = !inFence
    if (inFence) continue
    const task = TASK_RE.exec(raw)
    if (task) {
      if (task[1] !== ' ') continue
      priority = Math.max(priority, parsePriority(task[2]))
      const due = parseDue(task[2])
      if (due && (!earliest || dueKey(due) < dueKey(earliest))) earliest = due
    } else if (!noteDue && raw.replace(MARKERS_RE, '').trim() === '') {
      noteDue = parseDue(raw)
    }
  }
  const due = noteDue ?? earliest
  return due || priority ? { due, priority, done: false } : null
}

function today(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** `overdue` / `today` / `null`; a date-only due is overdue from the next day */
export function dueState(due: Due, done: boolean): 'overdue' | 'today' | null {
  if (done) return null
  const t = today()
  if (due.date < t) return 'overdue'
  if (due.date > t) return null
  if (due.time) {
    const [h, m] = due.time.split(':').map(Number)
    const now = new Date()
    if (now.getHours() * 60 + now.getMinutes() > h * 60 + m) return 'overdue'
  }
  return 'today'
}

/** `10/20 15:00`, `10/20〜10/23`; the year only when it isn't this year */
export function formatDue(due: Due): string {
  const year = String(new Date().getFullYear())
  const ja = lang() === 'ja'
  const md = (date: string) => {
    const [y, mo, d] = date.split('-')
    const short = `${Number(mo)}/${Number(d)}`
    if (y === year) return short
    return ja ? `${y}/${short}` : `${short}/${y}`
  }
  const range = ja ? '〜' : ' – '
  return `${due.start ? `${md(due.start)}${range}` : ''}${md(due.date)}${due.time ? ` ${due.time}` : ''}`
}
