import { useEffect, useRef, useState } from 'react'
import { db, SEED_ARTICLES } from '../db'
import type { Article } from '../db'
import type { VectorSearchResult } from 'taladb'

type ModelStatus = 'idle' | 'downloading' | 'ready' | 'error'

const CATEGORIES = ['All', 'rust', 'webassembly', 'databases', 'ai', 'javascript']

const CATEGORY_STYLES: Record<string, string> = {
  rust:        'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800',
  webassembly: 'bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800',
  databases:   'bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800',
  ai:          'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  javascript:  'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
}

let embedder: ((text: string) => Promise<number[]>) | null = null

export default function SearchTab() {
  const [modelStatus, setModelStatus]   = useState<ModelStatus>('idle')
  const [modelProgress, setModelProgress] = useState(0)
  const [seeded, setSeeded]             = useState(false)
  const [query, setQuery]               = useState('')
  const [filterCategory, setFilterCategory] = useState('All')
  const [results, setResults]           = useState<VectorSearchResult<Article>[]>([])
  const [searching, setSearching]       = useState(false)
  const [articleCount, setArticleCount] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const col = db().collection<Article>('articles') as any

  async function loadModel() {
    if (embedder) { setModelStatus('ready'); return }
    setModelStatus('downloading')
    try {
      const { pipeline } = await import('@huggingface/transformers')
      const pipe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
        progress_callback: (p: { progress?: number; status: string }) => {
          if (p.progress != null) setModelProgress(Math.round(p.progress))
          if (p.status === 'ready') setModelProgress(100)
        },
      })
      embedder = async (text: string) => {
        const out = await pipe(text, { pooling: 'mean', normalize: true })
        return Array.from(out.data as Float32Array)
      }
      setModelStatus('ready')
    } catch (e) {
      console.error('Model load failed', e)
      setModelStatus('error')
    }
  }

  async function seedArticles() {
    const count = await col.count()
    if (count > 0) { setArticleCount(count); setSeeded(true); return }
    if (!embedder) return
    for (const article of SEED_ARTICLES) {
      const embedding = await embedder(article.title + ' ' + article.body)
      await col.insert({ ...article, embedding })
    }
    setArticleCount(SEED_ARTICLES.length)
    setSeeded(true)
  }

  useEffect(() => { loadModel() }, [])
  useEffect(() => { if (modelStatus === 'ready') seedArticles() }, [modelStatus])

  async function runSearch(q: string, category: string) {
    if (!q.trim() || !embedder || !seeded) { setResults([]); return }
    setSearching(true)
    const vec    = await embedder(q)
    const filter = category !== 'All' ? { category } : undefined
    const hits   = await col.findNearest('embedding', vec, 6, filter as never)
    setResults(hits)
    setSearching(false)
  }

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runSearch(val, filterCategory), 350)
  }

  function handleCategoryChange(category: string) {
    setFilterCategory(category)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runSearch(query, category), 50)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Model banner */}
      <ModelBanner status={modelStatus} progress={modelProgress} />

      {/* Search hero */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-xs font-mono text-slate-400 dark:text-slate-500">
            {seeded
              ? `${articleCount} articles indexed with 384-dim embeddings · all-MiniLM-L6-v2`
              : modelStatus === 'ready'
              ? 'Generating embeddings…'
              : 'Loading model…'}
          </p>
          {seeded && (
            <span className="text-xs bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800 px-2.5 py-1 rounded-full font-medium">
              On-device · No server
            </span>
          )}
        </div>

        <input
          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-4 py-3.5 text-base outline-none focus:ring-2 focus:ring-teal-400/50 focus:border-teal-400 dark:focus:border-teal-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder="Ask anything — try 'how to prevent memory bugs' or 'offline apps'"
          value={query}
          onChange={handleQueryChange}
          disabled={!seeded}
        />

        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => handleCategoryChange(c)}
              className={`px-3.5 py-1.5 rounded-full text-sm border transition-all cursor-pointer font-medium ${
                filterCategory === c
                  ? 'bg-teal-500 text-white border-teal-500 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-teal-400 dark:hover:border-teal-600 hover:text-teal-600 dark:hover:text-teal-400'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {filterCategory !== 'All' && query && (
          <div className="flex items-center gap-2 text-sm text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-lg px-3 py-2">
            <span>⚡</span>
            <span>Hybrid search — filtering by <strong>{filterCategory}</strong>, then ranking by semantic similarity</span>
          </div>
        )}
      </div>

      {/* Searching indicator */}
      {searching && (
        <div className="flex items-center gap-3 text-sm text-slate-400 dark:text-slate-500">
          <div className="w-4 h-4 spinner" />
          <span>Searching…</span>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && !searching && (
        <div className="flex flex-col gap-3">
          {results.map(({ document, score }, i) => (
            <ResultCard key={document._id} article={document} score={score} rank={i + 1} />
          ))}
        </div>
      )}

      {/* Empty */}
      {query && results.length === 0 && !searching && seeded && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400 dark:text-slate-500">
          <span className="text-4xl">🔎</span>
          <p className="text-sm">No results for "{query}"</p>
        </div>
      )}

      {/* Suggestions */}
      {!query && seeded && (
        <SuggestedQueries onSelect={(q) => { setQuery(q); runSearch(q, filterCategory) }} />
      )}

      {/* Feature strip */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
        {["createVectorIndex('embedding', { dimensions: 384 })", 'findNearest(field, vec, topK)', 'hybrid filter + vector ranking', 'all-MiniLM-L6-v2 on-device'].map((f) => (
          <span key={f} className="text-xs font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-full">
            {f}
          </span>
        ))}
      </div>
    </div>
  )
}

function ModelBanner({ status, progress }: { status: ModelStatus; progress: number }) {
  if (status === 'ready') return null
  if (status === 'error') {
    return (
      <div className="flex items-center gap-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl px-4 py-3 text-sm">
        <span className="text-base">⚠</span>
        Failed to load the embedding model. Check your network connection and reload.
      </div>
    )
  }
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3.5 flex flex-col gap-2.5 shadow-sm">
      <div className="flex items-center gap-2.5 text-sm text-slate-500 dark:text-slate-400">
        <div className="w-4 h-4 spinner flex-shrink-0" />
        <span>
          {status === 'idle'
            ? 'Preparing model…'
            : `Downloading all-MiniLM-L6-v2 (~23 MB) · ${progress}%`}
        </span>
      </div>
      <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-teal-500 to-teal-400 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

function ResultCard({ article, score, rank }: { article: Article; score: number; rank: number }) {
  const pct      = Math.round(Math.max(0, Math.min(1, (score + 1) / 2) * 100))
  const cat      = article.category
  const catStyle = CATEGORY_STYLES[cat] ?? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-teal-300 dark:hover:border-teal-700 rounded-2xl p-5 flex gap-4 shadow-sm hover:shadow-md transition-all duration-150">
      <div className="text-sm font-bold text-teal-500 dark:text-teal-400 font-mono flex-shrink-0 pt-0.5 w-7">
        #{rank}
      </div>
      <div className="flex-1 flex flex-col gap-2.5 min-w-0">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{article.title}</h3>
          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border flex-shrink-0 ${catStyle}`}>
            {article.category}
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{article.body}</p>
        <div className="flex items-center gap-3 mt-1">
          <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-500 to-teal-400 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-teal-500 dark:text-teal-400 font-mono flex-shrink-0">
            {score.toFixed(3)}
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">cosine similarity</span>
        </div>
      </div>
    </div>
  )
}

function SuggestedQueries({ onSelect }: { onSelect: (q: string) => void }) {
  const suggestions = [
    'how to prevent memory bugs',
    'offline apps that work without internet',
    'search by meaning not keywords',
    'running code at native speed in the browser',
    'safe concurrency and multithreading',
    'AI models that run without a server',
  ]
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-slate-400 dark:text-slate-500">Try a query:</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => onSelect(s)}
            className="bg-white dark:bg-slate-900 hover:bg-teal-50 dark:hover:bg-teal-950/30 border border-slate-200 dark:border-slate-800 hover:border-teal-300 dark:hover:border-teal-700 text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 text-sm text-left px-4 py-3 rounded-xl transition-all cursor-pointer"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}
