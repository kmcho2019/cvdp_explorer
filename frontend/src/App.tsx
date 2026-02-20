import { useEffect, useMemo, useState } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Prism from 'prismjs'
import { filterIndexRecords, mapPrismLanguage, type IndexItem } from './lib/explorer'

type FileEntry = {
  path: string
  language: string
  content: string
  redacted?: boolean
}

type RecordDetail = {
  meta: {
    id: string
    dataset: string
    mode: string
    task_type: string
    commercial: boolean
    category: string
    difficulty: string
    title: string
  }
  prompt: {
    system: string
    user: string
  }
  context_files: FileEntry[]
  harness_files: FileEntry[]
  expected_outputs: {
    target_files: FileEntry[]
    response_text: string
    response_redacted: boolean
  }
  raw: {
    source_file: string
  }
}

type ViewFileGroup = 'context' | 'harness' | 'target'

type FileSelection = {
  group: ViewFileGroup
  path: string
}

const LARGE_FILE_HIGHLIGHT_THRESHOLD = 120_000

function getIdFromUrl(): string {
  return new URLSearchParams(window.location.search).get('id') ?? ''
}

function buildRecordUrl(recordId: string): string {
  const params = new URLSearchParams(window.location.search)
  params.set('id', recordId)
  return `${window.location.pathname}?${params.toString()}`
}

function CodeBlock({ file }: { file: FileEntry }): JSX.Element {
  const [forceHighlight, setForceHighlight] = useState(false)

  useEffect(() => {
    setForceHighlight(false)
  }, [file.path, file.content])

  const prismLanguage = mapPrismLanguage(file.language)
  const shouldHighlight = forceHighlight || file.content.length <= LARGE_FILE_HIGHLIGHT_THRESHOLD
  const grammar = shouldHighlight && prismLanguage !== 'none' ? Prism.languages[prismLanguage] : undefined
  const escaped = file.content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const html = grammar ? Prism.highlight(file.content, grammar, prismLanguage) : escaped

  return (
    <>
      {!shouldHighlight ? (
        <div className="performance-note">
          <span>
            Large file ({file.content.length.toLocaleString()} chars). Showing plain text for responsiveness.
          </span>
          <button type="button" className="retry-button" onClick={() => setForceHighlight(true)}>
            Enable syntax highlighting
          </button>
        </div>
      ) : null}
      <pre className={`code-panel language-${prismLanguage}`}>
        <code dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    </>
  )
}

function App(): JSX.Element {
  const [index, setIndex] = useState<IndexItem[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [selectedRecord, setSelectedRecord] = useState<RecordDetail | null>(null)
  const [selection, setSelection] = useState<FileSelection | null>(null)
  const [search, setSearch] = useState('')
  const [modeFilter, setModeFilter] = useState<'all' | 'agentic' | 'nonagentic'>('all')
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'easy' | 'medium' | 'hard'>('all')
  const [datasetFilter, setDatasetFilter] = useState('all')

  const [indexLoading, setIndexLoading] = useState(true)
  const [indexError, setIndexError] = useState<string | null>(null)
  const [recordLoading, setRecordLoading] = useState(false)
  const [recordError, setRecordError] = useState<string | null>(null)

  const [indexReloadToken, setIndexReloadToken] = useState(0)
  const [recordReloadToken, setRecordReloadToken] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    setIndexLoading(true)
    setIndexError(null)

    fetch('./data/index.json', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load index: HTTP ${res.status}`)
        }
        return res.json()
      })
      .then((data: IndexItem[]) => {
        setIndex(data)

        if (data.length === 0) {
          setSelectedId('')
          return
        }

        const fromUrl = getIdFromUrl()
        setSelectedId((current) => {
          if (current !== '' && data.some((item) => item.id === current)) {
            return current
          }
          if (fromUrl !== '' && data.some((item) => item.id === fromUrl)) {
            return fromUrl
          }
          return data[0].id
        })
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) {
          return
        }
        console.error('Failed to load index:', err)
        setIndexError(err instanceof Error ? err.message : 'Unknown index loading error')
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIndexLoading(false)
        }
      })

    return () => controller.abort()
  }, [indexReloadToken])

  useEffect(() => {
    const handlePopstate = (): void => {
      const fromUrl = getIdFromUrl()
      if (fromUrl !== '' && index.some((item) => item.id === fromUrl)) {
        setSelectedId(fromUrl)
      }
    }

    window.addEventListener('popstate', handlePopstate)
    return () => {
      window.removeEventListener('popstate', handlePopstate)
    }
  }, [index])

  useEffect(() => {
    if (selectedId === '') {
      return
    }

    const urlId = getIdFromUrl()
    if (urlId !== selectedId) {
      window.history.pushState({}, '', buildRecordUrl(selectedId))
    }

    const controller = new AbortController()

    setRecordLoading(true)
    setRecordError(null)
    setSelectedRecord(null)
    setSelection(null)

    fetch(`./data/records/${selectedId}.json`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load record ${selectedId}: HTTP ${res.status}`)
        }
        return res.json()
      })
      .then((record: RecordDetail) => {
        setSelectedRecord(record)

        const firstContext = record.context_files[0]
        if (firstContext) {
          setSelection({ group: 'context', path: firstContext.path })
          return
        }

        const firstHarness = record.harness_files[0]
        if (firstHarness) {
          setSelection({ group: 'harness', path: firstHarness.path })
          return
        }

        const firstTarget = record.expected_outputs.target_files[0]
        if (firstTarget) {
          setSelection({ group: 'target', path: firstTarget.path })
          return
        }

        setSelection(null)
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) {
          return
        }
        console.error('Failed to load record:', err)
        setRecordError(err instanceof Error ? err.message : 'Unknown record loading error')
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setRecordLoading(false)
        }
      })

    return () => controller.abort()
  }, [selectedId, recordReloadToken])

  const datasets = useMemo(() => {
    return ['all', ...Array.from(new Set(index.map((item) => item.dataset))).sort()]
  }, [index])

  const filtered = useMemo(() => {
    return filterIndexRecords(index, {
      search,
      modeFilter,
      difficultyFilter,
      datasetFilter,
    })
  }, [index, search, modeFilter, difficultyFilter, datasetFilter])

  const selectedFile = useMemo(() => {
    if (!selectedRecord || !selection) return null
    if (selection.group === 'context') {
      return selectedRecord.context_files.find((f) => f.path === selection.path) ?? null
    }
    if (selection.group === 'harness') {
      return selectedRecord.harness_files.find((f) => f.path === selection.path) ?? null
    }
    return selectedRecord.expected_outputs.target_files.find((f) => f.path === selection.path) ?? null
  }, [selectedRecord, selection])

  const retryIndex = (): void => {
    setIndexReloadToken((value) => value + 1)
  }

  const retryRecord = (): void => {
    setRecordReloadToken((value) => value + 1)
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <header className="sidebar-header">
          <h1>CVDP Explorer</h1>
          <p aria-live="polite">
            {indexLoading ? 'Loading records...' : `${filtered.length} records`}
          </p>
        </header>

        <div className="filters" aria-label="record filters">
          <label className="filter-label" htmlFor="search-input">
            Search
          </label>
          <input
            id="search-input"
            aria-label="Search records"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search id/title/category..."
          />

          <label className="filter-label" htmlFor="dataset-filter">
            Dataset
          </label>
          <select
            id="dataset-filter"
            aria-label="Filter by dataset"
            value={datasetFilter}
            onChange={(e) => setDatasetFilter(e.target.value)}
          >
            {datasets.map((dataset) => (
              <option key={dataset} value={dataset}>
                {dataset}
              </option>
            ))}
          </select>

          <label className="filter-label" htmlFor="mode-filter">
            Mode
          </label>
          <select
            id="mode-filter"
            aria-label="Filter by mode"
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value as 'all' | 'agentic' | 'nonagentic')}
          >
            <option value="all">all modes</option>
            <option value="agentic">agentic</option>
            <option value="nonagentic">nonagentic</option>
          </select>

          <label className="filter-label" htmlFor="difficulty-filter">
            Difficulty
          </label>
          <select
            id="difficulty-filter"
            aria-label="Filter by difficulty"
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value as 'all' | 'easy' | 'medium' | 'hard')}
          >
            <option value="all">all difficulty</option>
            <option value="easy">easy</option>
            <option value="medium">medium</option>
            <option value="hard">hard</option>
          </select>
        </div>

        {indexError ? (
          <div className="sidebar-error" role="alert">
            <p>Failed to load dataset index.</p>
            <p className="error-detail">{indexError}</p>
            <button type="button" className="retry-button" onClick={retryIndex}>
              Retry index load
            </button>
          </div>
        ) : null}

        <ul className="record-list">
          {!indexLoading && filtered.length === 0 ? (
            <li className="empty-message">No records match current filters.</li>
          ) : null}
          {filtered.map((item) => (
            <li key={item.id}>
              <button
                className={item.id === selectedId ? 'record-item active' : 'record-item'}
                onClick={() => setSelectedId(item.id)}
                aria-label={`Open ${item.id}`}
              >
                <div className="record-title">{item.title}</div>
                <div className="record-meta">{item.id}</div>
                <div className="record-badges">
                  <span>{item.mode}</span>
                  <span>{item.difficulty}</span>
                  <span>{item.category}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <main className="main-panel">
        {indexLoading ? (
          <section className="card">
            <h2>Loading dataset index...</h2>
            <p className="loading-message">Preparing benchmark list.</p>
          </section>
        ) : indexError ? (
          <section className="card" role="alert">
            <h2>Unable to load explorer data</h2>
            <p>{indexError}</p>
            <button type="button" className="retry-button" onClick={retryIndex}>
              Retry
            </button>
          </section>
        ) : index.length === 0 ? (
          <section className="card">
            <h2>No records found</h2>
            <p>Processed data index is empty.</p>
          </section>
        ) : recordError ? (
          <section className="card" role="alert">
            <h2>Unable to load selected record</h2>
            <p>{recordError}</p>
            <button type="button" className="retry-button" onClick={retryRecord}>
              Retry record load
            </button>
          </section>
        ) : recordLoading || selectedRecord === null ? (
          <section className="card">
            <h2>Loading record...</h2>
            <p className="loading-message">Fetching benchmark details.</p>
          </section>
        ) : (
          <>
            <section className="record-header card">
              <h2>{selectedRecord.meta.title}</h2>
              <p>{selectedRecord.meta.id}</p>
              <div className="badge-row">
                <span>{selectedRecord.meta.mode}</span>
                <span>{selectedRecord.meta.task_type}</span>
                <span>{selectedRecord.meta.difficulty}</span>
                <span>{selectedRecord.meta.category}</span>
                <span>{selectedRecord.meta.commercial ? 'commercial' : 'no-commercial'}</span>
                <span>{selectedRecord.raw.source_file}</span>
              </div>
            </section>

            <section className="card">
              <h3>Prompt</h3>
              {selectedRecord.prompt.system.trim() !== '' ? (
                <div className="prompt-block">
                  <h4>System Message</h4>
                  <Markdown remarkPlugins={[remarkGfm]}>{selectedRecord.prompt.system}</Markdown>
                </div>
              ) : null}
              <div className="prompt-block">
                <h4>User Prompt</h4>
                <Markdown remarkPlugins={[remarkGfm]}>{selectedRecord.prompt.user}</Markdown>
              </div>
            </section>

            <section className="card file-layout">
              <div className="file-nav">
                <h3>Files</h3>

                <p>Context</p>
                {selectedRecord.context_files.length === 0 ? <div className="empty-note">No context files.</div> : null}
                {selectedRecord.context_files.map((file) => (
                  <button
                    key={`context-${file.path}`}
                    className={selection?.group === 'context' && selection.path === file.path ? 'file-item active' : 'file-item'}
                    onClick={() => setSelection({ group: 'context', path: file.path })}
                  >
                    {file.path}
                  </button>
                ))}

                <p>Harness</p>
                {selectedRecord.harness_files.length === 0 ? <div className="empty-note">No harness files.</div> : null}
                {selectedRecord.harness_files.map((file) => (
                  <button
                    key={`harness-${file.path}`}
                    className={selection?.group === 'harness' && selection.path === file.path ? 'file-item active' : 'file-item'}
                    onClick={() => setSelection({ group: 'harness', path: file.path })}
                  >
                    {file.path}
                  </button>
                ))}

                <p>Expected Output</p>
                {selectedRecord.expected_outputs.target_files.length === 0 ? <div className="empty-note">No target files.</div> : null}
                {selectedRecord.expected_outputs.target_files.map((file) => (
                  <button
                    key={`target-${file.path}`}
                    className={selection?.group === 'target' && selection.path === file.path ? 'file-item active' : 'file-item'}
                    onClick={() => setSelection({ group: 'target', path: file.path })}
                  >
                    {file.path}
                    {file.redacted ? ' (redacted)' : ''}
                  </button>
                ))}
              </div>

              <div className="file-viewer">
                {selectedFile ? (
                  <>
                    <div className="file-title">{selectedFile.path}</div>
                    {selectedFile.redacted ? <div className="redaction">Expected output is redacted in this dataset release.</div> : null}
                    <CodeBlock file={selectedFile} />
                  </>
                ) : (
                  <p>Select a file to view content.</p>
                )}
              </div>
            </section>

            <section className="card">
              <h3>Reference Response</h3>
              {selectedRecord.expected_outputs.response_redacted ? (
                <div className="redaction">Reference response is redacted in this dataset release.</div>
              ) : (
                <Markdown remarkPlugins={[remarkGfm]}>{selectedRecord.expected_outputs.response_text}</Markdown>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}

export default App
