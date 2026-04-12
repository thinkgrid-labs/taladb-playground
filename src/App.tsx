import { useEffect, useState } from 'react'
import { TalaDBProvider } from '@taladb/react'
import { initDB } from './db'
import type { TalaDB } from 'taladb'
import NotesTab from './components/NotesTab'
import SearchTab from './components/SearchTab'
import FtsHnswTab from './components/FtsHnswTab'

type Tab = 'notes' | 'search' | 'fts-hnsw'

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('theme')
    if (stored) return stored === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  return [dark, setDark] as const
}

export default function App() {
  const [dbInstance, setDbInstance] = useState<TalaDB | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('notes')
  const [dark, setDark] = useDarkMode()

  useEffect(() => {
    initDB()
      .then((db) => setDbInstance(db))
      .catch((e) => setError(String(e)))
  }, [])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="bg-white dark:bg-slate-900 border border-red-300 dark:border-red-800 rounded-2xl p-8 text-center max-w-lg w-full shadow-xl">
          <div className="text-4xl mb-4">⚠</div>
          <p className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Failed to open database</p>
          <code className="block text-xs text-red-500 dark:text-red-400 font-mono bg-red-50 dark:bg-red-950/40 rounded-lg p-3 text-left break-all">
            {error}
          </code>
        </div>
      </div>
    )
  }

  if (!dbInstance) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-slate-950">
        <div className="w-8 h-8 spinner" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Opening TalaDB…</p>
      </div>
    )
  }

  return (
    <TalaDBProvider db={dbInstance}>
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          {/* Brand */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-lg font-bold bg-gradient-to-r from-teal-400 to-blue-400 bg-clip-text text-transparent">
              TalaDB
            </span>
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-full">
              Playground
            </span>
          </div>

          {/* Tabs */}
          <nav className="flex-1 flex justify-center">
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              {([
                { id: 'notes', label: 'Notes', sub: 'Document DB', icon: '📝' },
                { id: 'search', label: 'Semantic Search', sub: 'Vector DB', icon: '🔍' },
                { id: 'fts-hnsw', label: 'FTS & HNSW', sub: 'New in 0.4', icon: '⚡' },
              ] as const).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                    activeTab === tab.id
                      ? 'bg-white dark:bg-slate-700 text-teal-500 dark:text-teal-400 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className={`hidden sm:inline text-xs px-1.5 py-0.5 rounded-full border ${
                    activeTab === tab.id
                      ? 'text-teal-500 dark:text-teal-400 border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/40'
                      : 'text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700'
                  }`}>
                    {tab.sub}
                  </span>
                </button>
              ))}
            </div>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Dark mode toggle */}
            <button
              onClick={() => setDark((d) => !d)}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle dark mode"
            >
              {dark ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>

            <a
              href="https://github.com/thinkgrid-labs/taladb"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 border border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 px-3 py-1.5 rounded-lg transition-all"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              GitHub
            </a>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {activeTab === 'notes' && <NotesTab />}
        {activeTab === 'search' && <SearchTab />}
        {activeTab === 'fts-hnsw' && <FtsHnswTab />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-5 text-center text-sm text-slate-400 dark:text-slate-500">
        Built with{' '}
        <a href="https://github.com/thinkgrid-labs/taladb" target="_blank" rel="noreferrer" className="text-teal-500 hover:text-teal-400 transition-colors font-medium">
          TalaDB
        </a>
        {' '}— local-first document + vector database. Data lives in your browser via OPFS. No server. No cloud.
      </footer>
    </div>
    </TalaDBProvider>
  )
}
