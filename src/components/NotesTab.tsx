import { useEffect, useRef, useState } from 'react'
import { useCollection, useFind } from '@taladb/react'
import type { Note } from '../db'

const CATEGORIES = ['Personal', 'Work', 'Research', 'Ideas']

const CATEGORY_STYLES: Record<string, string> = {
  Personal: 'bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800',
  Work:     'bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800',
  Research: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  Ideas:    'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
}

function tagList(raw: string): string[] {
  return raw.split(',').map((t) => t.trim()).filter(Boolean)
}

export default function NotesTab() {
  const [query, setQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const titleRef    = useRef<HTMLInputElement>(null)
  const bodyRef     = useRef<HTMLTextAreaElement>(null)
  const categoryRef = useRef<HTMLSelectElement>(null)
  const tagsRef     = useRef<HTMLInputElement>(null)

  // Memoised collection handle from the nearest <TalaDBProvider>.
  const col = useCollection<Note>('notes')

  // Live subscription — re-renders automatically whenever notes change.
  // Scoped to the selected category when one is active.
  const { data: liveNotes } = useFind(
    col,
    filterCategory ? { category: filterCategory } : undefined,
  )

  // Total count (unfiltered) — a separate useFind with no filter.
  const { data: allNotes } = useFind(col)

  // FTS text search — run a manual find against the FTS index when query changes
  // or when live data changes (picks up newly inserted matching notes in real time).
  const [notes, setNotes] = useState<Note[]>([])
  useEffect(() => {
    if (!query) {
      const sorted = [...liveNotes].sort((a, b) => b.createdAt - a.createdAt)
      setNotes(sorted)
      return
    }
    let cancelled = false
    async function runSearch() {
      const filter = filterCategory ? { category: filterCategory } : {}
      const byBody  = await col.find({ body:  { $contains: query }, ...filter })
      const byTitle = await col.find({ title: { $contains: query }, ...filter })
      if (cancelled) return
      const seen = new Set(byBody.map((n) => n._id))
      const merged = [...byBody, ...byTitle.filter((n) => !seen.has(n._id))]
      merged.sort((a, b) => b.createdAt - a.createdAt)
      setNotes(merged)
    }
    runSearch()
    return () => { cancelled = true }
  }, [query, filterCategory, liveNotes])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const title = titleRef.current!.value.trim()
    const body  = bodyRef.current!.value.trim()
    if (!title || !body) return
    setSaving(true)
    await col.insert({
      title, body,
      category: categoryRef.current!.value,
      tags: tagList(tagsRef.current!.value),
      createdAt: Date.now(),
    })
    setSaving(false)
    setShowForm(false)
    titleRef.current!.value = ''
    bodyRef.current!.value  = ''
    tagsRef.current!.value  = ''
  }

  async function handleDelete(id: string) {
    await col.deleteOne({ _id: id })
  }

  const inputCls = 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-400/50 focus:border-teal-400 dark:focus:border-teal-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500'

  return (
    <div className="flex flex-col gap-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 shadow-sm">
          <span className="text-2xl font-bold text-teal-500 dark:text-teal-400 tabular-nums">{allNotes.length}</span>
          <span className="text-sm text-slate-400 dark:text-slate-500">notes stored</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            className={`${inputCls} w-48`}
            placeholder="Search notes…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            className={`${inputCls} cursor-pointer`}
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button
            className="bg-teal-500 hover:bg-teal-400 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer"
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? 'Cancel' : '+ New note'}
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <form
          onSubmit={handleSave}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col gap-3"
        >
          <div className="flex gap-3">
            <input ref={titleRef} className={`${inputCls} flex-1`} placeholder="Title" required />
            <select ref={categoryRef} className={`${inputCls} cursor-pointer`}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <textarea
            ref={bodyRef}
            className={`${inputCls} resize-none w-full`}
            placeholder="Write your note here…"
            rows={4}
            required
          />
          <div className="flex gap-3">
            <input ref={tagsRef} className={`${inputCls} flex-1`} placeholder="Tags (comma-separated)" />
            <button
              type="submit"
              disabled={saving}
              className="bg-teal-500 hover:bg-teal-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors cursor-pointer"
            >
              {saving ? 'Saving…' : 'Save note'}
            </button>
          </div>
        </form>
      )}

      {/* Notes grid */}
      {notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400 dark:text-slate-500">
          <span className="text-5xl">📭</span>
          <p className="text-sm">
            {query || filterCategory ? 'No notes match your search.' : 'No notes yet — create your first one!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map((note) => (
            <NoteCard key={note._id} note={note} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Feature strip */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
        {["useCollection()", "useFind(col, filter)", "createIndex('category')", "createIndex('_fts:body')", '$contains filter', 'OPFS persistence'].map((f) => (
          <span key={f} className="text-xs font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-full">
            {f}
          </span>
        ))}
      </div>
    </div>
  )
}

function NoteCard({ note, onDelete }: { note: Note; onDelete: (id: string) => void }) {
  const date = new Date(note.createdAt as number).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  })
  const cat = note.category as string
  const catStyle = CATEGORY_STYLES[cat] ?? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'

  return (
    <div className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-teal-300 dark:hover:border-teal-700 rounded-2xl p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-all duration-150">
      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${catStyle}`}>
          {cat}
        </span>
        <button
          onClick={() => onDelete(note._id!)}
          aria-label="Delete note"
          className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all text-sm cursor-pointer"
        >
          ✕
        </button>
      </div>

      <div>
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm mb-1">{note.title as string}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3">{note.body as string}</p>
      </div>

      {(note.tags as string[]).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {(note.tags as string[]).map((t) => (
            <span key={t} className="text-xs text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 px-2 py-0.5 rounded-full">
              #{t}
            </span>
          ))}
        </div>
      )}

      <p className="text-xs text-slate-400 dark:text-slate-500 mt-auto">{date}</p>
    </div>
  )
}
