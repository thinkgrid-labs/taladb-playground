import { useEffect, useRef, useState } from 'react'
import { db } from '../db'
import type { Note } from '../db'

// ---------------------------------------------------------------------------
// FTS demo — search notes using the inverted FTS index
// ---------------------------------------------------------------------------

function FtsSection() {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState<Note[]>([])
  const [elapsed, setElapsed] = useState<number | null>(null)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const col = db().collection<Note>('notes')

  async function search(q: string) {
    if (!q.trim()) { setResults([]); setElapsed(null); return }
    const t0 = performance.now()
    const hits = await col.find({ body: { $contains: q } })
    setElapsed(performance.now() - t0)
    setResults(hits)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => search(val), 250)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Full-Text Search</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Inverted token index on <code className="font-mono">notes.body</code> — fast <code className="font-mono">$contains</code> without a full scan.
          </p>
        </div>
        <span className="text-xs font-mono bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800 px-2.5 py-1 rounded-full flex-shrink-0">
          createFtsIndex('body')
        </span>
      </div>

      <input
        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-400/50 focus:border-teal-400 transition-all placeholder:text-slate-400"
        placeholder="Search note bodies — try a word from any note you created"
        value={query}
        onChange={handleChange}
      />

      {elapsed !== null && (
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Found <strong className="text-slate-700 dark:text-slate-200">{results.length}</strong> note{results.length !== 1 ? 's' : ''} in{' '}
          <strong className="text-teal-500">{elapsed.toFixed(2)} ms</strong> using FTS index
        </p>
      )}

      {results.length > 0 && (
        <div className="flex flex-col gap-2">
          {results.map((n) => (
            <div key={n._id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{n.title as string}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{n.body as string}</p>
            </div>
          ))}
        </div>
      )}

      {query && results.length === 0 && elapsed !== null && (
        <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6">No notes match "{query}"</p>
      )}

      {!query && (
        <div className="text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 leading-relaxed">
          <strong className="text-slate-600 dark:text-slate-300">How it works:</strong>{' '}
          <code className="font-mono">createFtsIndex('body')</code> builds an inverted index — each token maps to a list of document IDs.
          A <code className="font-mono">$contains</code> query looks up the token directly (O(1)) instead of scanning every document (O(n)).
          The query engine planner automatically selects <strong>FtsScan</strong> over <strong>FullScan</strong> when an FTS index exists.
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// HNSW explainer — available on Node/native, not in browser WASM
// ---------------------------------------------------------------------------

function HnswSection() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">HNSW Vector Index</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Approximate nearest-neighbour search — significantly faster on large collections than flat brute-force.
          </p>
        </div>
        <span className="text-xs font-mono bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-800 px-2.5 py-1 rounded-full flex-shrink-0">
          indexType: 'hnsw'
        </span>
      </div>

      {/* Runtime availability */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { runtime: 'Node.js', available: true,  note: '@taladb/node · full HNSW' },
          { runtime: 'React Native', available: true,  note: '@taladb/react-native · JSI' },
          { runtime: 'Browser (WASM)', available: false, note: 'rayon requires native threads' },
        ].map(({ runtime, available, note }) => (
          <div key={runtime} className={`border rounded-xl px-3 py-3 flex flex-col gap-1.5 ${available ? 'border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/30' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40'}`}>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold ${available ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 dark:text-slate-500'}`}>
                {available ? '✓' : '–'}
              </span>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{runtime}</span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500">{note}</p>
          </div>
        ))}
      </div>

      {/* API usage */}
      <div className="bg-slate-900 dark:bg-slate-950 border border-slate-700 rounded-xl px-4 py-4 flex flex-col gap-2">
        <p className="text-xs text-slate-400 font-mono mb-1">// Node.js / React Native</p>
        {[
          "// Create with HNSW from the start:",
          "await col.createVectorIndex('embedding', {",
          "  dimensions: 384,",
          "  indexType: 'hnsw',  // Hierarchical Navigable Small World",
          "  hnswM: 16,          // connectivity (default 16)",
          "  hnswEfConstruction: 200,",
          "});",
          "",
          "// Or upgrade an existing flat index in-place:",
          "await col.upgradeVectorIndex('embedding');",
          "",
          "// findNearest is the same API — HNSW is transparent:",
          "const results = await col.findNearest('embedding', vec, 10);",
        ].map((line, i) => (
          <p key={i} className={`text-xs font-mono ${line.startsWith('//') ? 'text-slate-500' : 'text-teal-300'}`}>
            {line || <>&nbsp;</>}
          </p>
        ))}
      </div>

      {/* Explainer */}
      <div className="text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 leading-relaxed">
        <strong className="text-slate-600 dark:text-slate-300">How HNSW works:</strong>{' '}
        Builds a multi-layer proximity graph at index time. Each <code className="font-mono">findNearest</code> starts at the
        coarse top layer and navigates to the fine-grained bottom — touching only a logarithmic fraction of vectors instead of
        scanning all of them. The same <code className="font-mono">findNearest</code> API is used regardless of index type;
        the engine selects the right search path automatically.
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Query planner explainer
// ---------------------------------------------------------------------------

function QueryPlannerSection() {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Query Engine & Planner</h2>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
          TalaDB automatically picks the cheapest execution plan based on available indexes.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          {
            plan: 'FullScan',
            color: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30',
            badge: 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400',
            desc: 'No usable index — iterates every document.',
            example: "find({ unknownField: 'x' })",
          },
          {
            plan: 'IndexScan',
            color: 'border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/30',
            badge: 'bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400',
            desc: 'B-tree index lookup — O(log n) key scan.',
            example: "find({ category: 'rust' })",
          },
          {
            plan: 'FtsScan',
            color: 'border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30',
            badge: 'bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400',
            desc: 'Inverted FTS index — direct token→doc lookup.',
            example: "find({ body: { $contains: 'rust' } })",
          },
          {
            plan: 'IndexOr',
            color: 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30',
            badge: 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400',
            desc: 'Union of index scans — sorted-merge join on ULIDs, zero duplicates.',
            example: "find({ $or: [{ category: 'ai' }, { category: 'rust' }] })",
          },
        ].map(({ plan, color, badge, desc, example }) => (
          <div key={plan} className={`border rounded-xl px-4 py-3 flex flex-col gap-2 ${color}`}>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-full ${badge}`}>{plan}</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">{desc}</p>
            <code className="text-xs font-mono text-slate-500 dark:text-slate-400 break-all">{example}</code>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main tab
// ---------------------------------------------------------------------------

export default function FtsHnswTab() {
  return (
    <div className="flex flex-col gap-8">
      <FtsSection />
      <div className="border-t border-slate-200 dark:border-slate-800" />
      <HnswSection />
      <div className="border-t border-slate-200 dark:border-slate-800" />
      <QueryPlannerSection />

      {/* Feature strip */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
        {[
          "createFtsIndex('body')",
          '$contains → FtsScan',
          "indexType: 'hnsw'",
          'upgradeVectorIndex()',
          'IndexOr union scan',
          'query planner',
        ].map((f) => (
          <span key={f} className="text-xs font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-full">
            {f}
          </span>
        ))}
      </div>
    </div>
  )
}
