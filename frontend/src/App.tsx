import { useEffect, useMemo, useRef, useState } from 'react'
import Markdown from 'react-markdown'
import type { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Prism from 'prismjs'
import { filterIndexRecords, mapPrismLanguage, type IndexItem } from './lib/explorer'
import { useDebouncedValue } from './lib/useDebouncedValue'
import { getBadgeClassName, type BadgeKind } from './lib/badges'
import { highlightPromptCode, isInlineCodeNode } from './lib/promptMarkdown'
import { formatCategoryLabel } from './lib/categories'

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

type ModeFilter = 'all' | 'agentic' | 'nonagentic'
type DifficultyFilter = 'all' | 'easy' | 'medium' | 'hard'

type UrlState = {
  id: string
  search: string
  modeFilter: ModeFilter
  difficultyFilter: DifficultyFilter
  datasetFilter: string
  categoryFilter: string
}

const LARGE_FILE_HIGHLIGHT_THRESHOLD = 120_000
const SIDEBAR_ROW_HEIGHT = 118
const SIDEBAR_OVERSCAN = 8
const SEARCH_DEBOUNCE_MS = 120

function normalizeNamedFilter(value: string | null): string {
  const trimmed = value?.trim() ?? ''
  return trimmed === '' ? 'all' : trimmed
}

function parseModeFilter(value: string | null): ModeFilter {
  return value === 'agentic' || value === 'nonagentic' ? value : 'all'
}

function parseDifficultyFilter(value: string | null): DifficultyFilter {
  return value === 'easy' || value === 'medium' || value === 'hard' ? value : 'all'
}

function readUrlState(): UrlState {
  const params = new URLSearchParams(window.location.search)
  return {
    id: params.get('id') ?? '',
    search: params.get('q') ?? '',
    modeFilter: parseModeFilter(params.get('mode')),
    difficultyFilter: parseDifficultyFilter(params.get('difficulty')),
    datasetFilter: normalizeNamedFilter(params.get('dataset')),
    categoryFilter: normalizeNamedFilter(params.get('category')),
  }
}

function getIdFromUrl(): string {
  return readUrlState().id
}

function buildExplorerUrl(state: UrlState): string {
  const params = new URLSearchParams(window.location.search)

  if (state.id !== '') params.set('id', state.id)
  else params.delete('id')

  if (state.search.trim() !== '') params.set('q', state.search)
  else params.delete('q')

  if (state.modeFilter !== 'all') params.set('mode', state.modeFilter)
  else params.delete('mode')

  if (state.difficultyFilter !== 'all') params.set('difficulty', state.difficultyFilter)
  else params.delete('difficulty')

  if (state.datasetFilter !== 'all') params.set('dataset', state.datasetFilter)
  else params.delete('dataset')

  if (state.categoryFilter !== 'all') params.set('category', state.categoryFilter)
  else params.delete('category')

  const query = params.toString()
  return query === '' ? window.location.pathname : `${window.location.pathname}?${query}`
}

function buildRecordUrl(recordId: string): string {
  return buildExplorerUrl({
    ...readUrlState(),
    id: recordId,
  })
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

function MetadataBadge({
  kind,
  value,
  displayValue,
  title,
}: {
  kind: BadgeKind
  value: string
  displayValue?: string
  title?: string
}): JSX.Element {
  return (
    <span className={getBadgeClassName(kind, value)} title={title}>
      {displayValue ?? value}
    </span>
  )
}

const promptMarkdownComponents: Components = {
  code(props) {
    const { className, children } = props
    const raw = String(children ?? '').replace(/\n$/, '')

    if (isInlineCodeNode(className, raw)) {
      return <code className="prompt-inline-code">{children}</code>
    }

    const { html, language } = highlightPromptCode(raw, className)

    return (
      <pre className={`markdown-code language-${language}`}>
        <code className={`language-${language}`} dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    )
  },
}

function PromptMarkdown({ content }: { content: string }): JSX.Element {
  return (
    <Markdown remarkPlugins={[remarkGfm]} components={promptMarkdownComponents}>
      {content}
    </Markdown>
  )
}

function App(): JSX.Element {
  const initialUrlState = useMemo(() => readUrlState(), [])

  const [index, setIndex] = useState<IndexItem[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [selectedRecord, setSelectedRecord] = useState<RecordDetail | null>(null)
  const [selection, setSelection] = useState<FileSelection | null>(null)

  const [search, setSearch] = useState(initialUrlState.search)
  const [modeFilter, setModeFilter] = useState<ModeFilter>(initialUrlState.modeFilter)
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>(initialUrlState.difficultyFilter)
  const [datasetFilter, setDatasetFilter] = useState(initialUrlState.datasetFilter)
  const [categoryFilter, setCategoryFilter] = useState(initialUrlState.categoryFilter)

  const [indexLoading, setIndexLoading] = useState(true)
  const [indexError, setIndexError] = useState<string | null>(null)
  const [recordLoading, setRecordLoading] = useState(false)
  const [recordError, setRecordError] = useState<string | null>(null)

  const [indexReloadToken, setIndexReloadToken] = useState(0)
  const [recordReloadToken, setRecordReloadToken] = useState(0)

  const recordListRef = useRef<HTMLUListElement | null>(null)
  const [listScrollTop, setListScrollTop] = useState(0)
  const [listHeight, setListHeight] = useState(420)

  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS)

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
      const state = readUrlState()

      setSearch(state.search)
      setModeFilter(state.modeFilter)
      setDifficultyFilter(state.difficultyFilter)
      setDatasetFilter(state.datasetFilter)
      setCategoryFilter(state.categoryFilter)

      if (state.id !== '' && index.some((item) => item.id === state.id)) {
        setSelectedId(state.id)
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

  useEffect(() => {
    const updateListSize = (): void => {
      if (recordListRef.current) {
        setListHeight(recordListRef.current.clientHeight)
      }
    }

    updateListSize()
    window.addEventListener('resize', updateListSize)
    return () => {
      window.removeEventListener('resize', updateListSize)
    }
  }, [indexLoading, indexError])

  useEffect(() => {
    setListScrollTop(0)
    if (recordListRef.current) {
      recordListRef.current.scrollTop = 0
    }
  }, [debouncedSearch, modeFilter, difficultyFilter, datasetFilter, categoryFilter])

  const datasets = useMemo(() => {
    return ['all', ...Array.from(new Set(index.map((item) => item.dataset))).sort()]
  }, [index])

  const categories = useMemo(() => {
    return ['all', ...Array.from(new Set(index.map((item) => item.category))).sort()]
  }, [index])

  useEffect(() => {
    if (indexLoading || index.length === 0) {
      return
    }

    if (!datasets.includes(datasetFilter)) {
      setDatasetFilter('all')
    }

    if (!categories.includes(categoryFilter)) {
      setCategoryFilter('all')
    }
  }, [indexLoading, index.length, datasets, categories, datasetFilter, categoryFilter])

  useEffect(() => {
    const currentId = getIdFromUrl()
    const nextUrl = buildExplorerUrl({
      id: currentId,
      search: debouncedSearch,
      modeFilter,
      difficultyFilter,
      datasetFilter,
      categoryFilter,
    })
    const currentUrl = `${window.location.pathname}${window.location.search}`
    if (nextUrl !== currentUrl) {
      window.history.replaceState({}, '', nextUrl)
    }
  }, [debouncedSearch, modeFilter, difficultyFilter, datasetFilter, categoryFilter])

  const filtered = useMemo(() => {
    return filterIndexRecords(index, {
      search: debouncedSearch,
      modeFilter,
      difficultyFilter,
      datasetFilter,
      categoryFilter,
    })
  }, [index, debouncedSearch, modeFilter, difficultyFilter, datasetFilter, categoryFilter])

  useEffect(() => {
    if (indexLoading || filtered.length === 0) {
      return
    }
    if (!filtered.some((item) => item.id === selectedId)) {
      setSelectedId(filtered[0].id)
    }
  }, [filtered, selectedId, indexLoading])

  const virtualization = useMemo(() => {
    if (filtered.length === 0) {
      return {
        visibleItems: filtered,
        topSpacerHeight: 0,
        bottomSpacerHeight: 0,
      }
    }

    const startIndex = Math.max(0, Math.floor(listScrollTop / SIDEBAR_ROW_HEIGHT) - SIDEBAR_OVERSCAN)
    const visibleCount = Math.ceil(listHeight / SIDEBAR_ROW_HEIGHT) + SIDEBAR_OVERSCAN * 2
    const endIndex = Math.min(filtered.length, startIndex + visibleCount)

    return {
      visibleItems: filtered.slice(startIndex, endIndex),
      topSpacerHeight: startIndex * SIDEBAR_ROW_HEIGHT,
      bottomSpacerHeight: (filtered.length - endIndex) * SIDEBAR_ROW_HEIGHT,
    }
  }, [filtered, listScrollTop, listHeight])

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
            {indexLoading ? 'Loading records...' : `${filtered.length} of ${index.length} records`}
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
            onChange={(e) => setModeFilter(e.target.value as ModeFilter)}
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
            onChange={(e) => setDifficultyFilter(e.target.value as DifficultyFilter)}
          >
            <option value="all">all difficulty</option>
            <option value="easy">easy</option>
            <option value="medium">medium</option>
            <option value="hard">hard</option>
          </select>

          <label className="filter-label" htmlFor="category-filter">
            Category
          </label>
          <select
            id="category-filter"
            aria-label="Filter by category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category === 'all' ? 'all categories' : formatCategoryLabel(category)}
              </option>
            ))}
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

        <ul
          ref={recordListRef}
          className="record-list"
          onScroll={(event) => setListScrollTop(event.currentTarget.scrollTop)}
        >
          {!indexLoading && filtered.length === 0 ? <li className="empty-message">No records match current filters.</li> : null}
          {filtered.length > 0 ? (
            <>
              {virtualization.topSpacerHeight > 0 ? (
                <li className="record-spacer" aria-hidden style={{ height: `${virtualization.topSpacerHeight}px` }} />
              ) : null}
              {virtualization.visibleItems.map((item) => (
                <li key={item.id} className="record-row">
                  <button
                    className={item.id === selectedId ? 'record-item active' : 'record-item'}
                    onClick={() => setSelectedId(item.id)}
                    aria-label={`Open ${item.id}`}
                  >
                    <div className="record-title">{item.title}</div>
                    <div className="record-meta">
                      <MetadataBadge kind="id" value={item.id} />
                    </div>
                    <div className="record-badges">
                      <MetadataBadge kind="mode" value={item.mode} />
                      <MetadataBadge kind="difficulty" value={item.difficulty} />
                      <MetadataBadge kind="category" value={item.category} title={formatCategoryLabel(item.category)} />
                    </div>
                  </button>
                </li>
              ))}
              {virtualization.bottomSpacerHeight > 0 ? (
                <li className="record-spacer" aria-hidden style={{ height: `${virtualization.bottomSpacerHeight}px` }} />
              ) : null}
            </>
          ) : null}
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
              <p>
                <MetadataBadge kind="id" value={selectedRecord.meta.id} />
              </p>
              <div className="badge-row">
                <MetadataBadge kind="mode" value={selectedRecord.meta.mode} />
                <MetadataBadge kind="taskType" value={selectedRecord.meta.task_type} />
                <MetadataBadge kind="difficulty" value={selectedRecord.meta.difficulty} />
                <MetadataBadge
                  kind="category"
                  value={selectedRecord.meta.category}
                  displayValue={formatCategoryLabel(selectedRecord.meta.category)}
                />
                <MetadataBadge kind="dataset" value={selectedRecord.meta.dataset} />
                <MetadataBadge kind="commercial" value={selectedRecord.meta.commercial ? 'commercial' : 'no-commercial'} />
                <MetadataBadge kind="source" value={selectedRecord.raw.source_file} />
              </div>
            </section>

            <section className="card">
              <h3>Prompt</h3>
              {selectedRecord.prompt.system.trim() !== '' ? (
                <div className="prompt-block">
                  <h4>System Message</h4>
                  <PromptMarkdown content={selectedRecord.prompt.system} />
                </div>
              ) : null}
              <div className="prompt-block">
                <h4>User Prompt</h4>
                <PromptMarkdown content={selectedRecord.prompt.user} />
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
                <PromptMarkdown content={selectedRecord.expected_outputs.response_text} />
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}

export default App
