import { useEffect, useMemo, useRef, useState } from 'react'
import Markdown from 'react-markdown'
import type { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Prism from 'prismjs'
import { filterIndexRecords, isMarkdownLikeFile, mapPrismLanguage, type IndexItem } from './lib/explorer'
import { useDebouncedValue } from './lib/useDebouncedValue'
import { getBadgeClassName, type BadgeKind } from './lib/badges'
import { highlightPromptCode, isInlineCodeNode } from './lib/promptMarkdown'
import { formatCategoryLabel } from './lib/categories'
import { buildFilterHierarchy } from './lib/hierarchy'
import {
  availabilityLabel,
  BENCHMARK_INTERACTION_CASES,
  BENCHMARK_REFERENCE_PIN,
  BENCHMARK_OVERVIEW,
  CATEGORY_TO_INTERACTION_CASE,
  CATEGORY_GUIDE_ROWS,
  EVALUATION_FLOW_STEPS,
  EXPLORER_RUNTIME_MAPPINGS,
  scoringModeLabel,
  type BenchmarkCategoryGuide,
} from './lib/benchmarkGuide'

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
type TaskTypeFilter = 'all' | 'code_generation' | 'code_comprehension'
type MainPanelSection = 'records' | 'benchmark'

type UrlState = {
  id: string
  search: string
  taskTypeFilter: TaskTypeFilter
  modeFilter: ModeFilter
  difficultyFilter: DifficultyFilter
  datasetFilter: string
  categoryFilter: string
}

const LARGE_FILE_HIGHLIGHT_THRESHOLD = 120_000
const SIDEBAR_ROW_HEIGHT = 118
const SIDEBAR_OVERSCAN = 8
const SEARCH_DEBOUNCE_MS = 120
let mermaidInitialized = false
let mermaidDiagramSequence = 0

function nextMermaidDiagramId(): string {
  mermaidDiagramSequence += 1
  return `cvdp-guide-mermaid-${mermaidDiagramSequence}`
}

function normalizeNamedFilter(value: string | null): string {
  const trimmed = value?.trim() ?? ''
  return trimmed === '' ? 'all' : trimmed
}

function parseModeFilter(value: string | null): ModeFilter {
  return value === 'agentic' || value === 'nonagentic' ? value : 'all'
}

function parseTaskTypeFilter(value: string | null): TaskTypeFilter {
  return value === 'code_generation' || value === 'code_comprehension' ? value : 'all'
}

function parseDifficultyFilter(value: string | null): DifficultyFilter {
  return value === 'easy' || value === 'medium' || value === 'hard' ? value : 'all'
}

function toDifficultyFilter(value: string): DifficultyFilter {
  if (value === 'easy' || value === 'medium' || value === 'hard') return value
  return 'all'
}

function taskTypeLabel(value: TaskTypeFilter): string {
  if (value === 'code_generation') return 'Code Generation'
  if (value === 'code_comprehension') return 'Code Comprehension'
  return 'All Task Types'
}

function scoringBadgeClassName(category: BenchmarkCategoryGuide): string {
  if (category.scoringMode === 'bleu') return 'guide-chip guide-chip--scoring-bleu'
  if (category.scoringMode === 'llm_subjective') return 'guide-chip guide-chip--scoring-llm'
  return 'guide-chip guide-chip--scoring-threshold'
}

function availabilityBadgeClassName(category: BenchmarkCategoryGuide): string {
  if (category.availability === 'both') return 'guide-chip guide-chip--availability-both'
  if (category.availability === 'agentic_only') return 'guide-chip guide-chip--availability-agentic'
  return 'guide-chip guide-chip--availability-nonagentic'
}

function interactionPathChipClassName(pathId: string): string {
  if (pathId === 'bleu_rouge_comprehension') return 'guide-chip guide-chip--scoring-bleu'
  if (pathId === 'llm_subjective_comprehension') return 'guide-chip guide-chip--scoring-llm'
  return 'guide-chip guide-chip--scoring-threshold'
}

function readUrlState(): UrlState {
  const params = new URLSearchParams(window.location.search)
  return {
    id: params.get('id') ?? '',
    search: params.get('q') ?? '',
    taskTypeFilter: parseTaskTypeFilter(params.get('task')),
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

  if (state.taskTypeFilter !== 'all') params.set('task', state.taskTypeFilter)
  else params.delete('task')

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

function FileViewerContent({ file }: { file: FileEntry }): JSX.Element {
  if (isMarkdownLikeFile(file.path, file.language)) {
    return (
      <div className="markdown-file-view">
        <PromptMarkdown content={file.content} />
      </div>
    )
  }
  return <CodeBlock file={file} />
}

function MermaidDiagram({ chart, title }: { chart: string; title: string }): JSX.Element {
  const diagramIdRef = useRef<string>('')
  if (diagramIdRef.current === '') {
    diagramIdRef.current = nextMermaidDiagramId()
  }

  const [svg, setSvg] = useState<string>('')
  const [renderState, setRenderState] = useState<'loading' | 'ready' | 'failed'>('loading')

  useEffect(() => {
    let cancelled = false
    setRenderState('loading')
    setSvg('')

    const renderMermaid = async (): Promise<void> => {
      try {
        const mermaidModule = await import('mermaid')
        const mermaid = mermaidModule.default

        if (!mermaidInitialized) {
          mermaid.initialize({
            startOnLoad: false,
            securityLevel: 'strict',
            theme: 'base',
            themeVariables: {
              primaryColor: '#eff6ff',
              primaryTextColor: '#0f172a',
              primaryBorderColor: '#2563eb',
              lineColor: '#334155',
              secondaryColor: '#f8fafc',
              tertiaryColor: '#eef2ff',
              fontFamily: '"IBM Plex Sans", "Segoe UI", sans-serif',
            },
            flowchart: {
              useMaxWidth: true,
              curve: 'basis',
            },
          })
          mermaidInitialized = true
        }

        const renderResult = await mermaid.render(diagramIdRef.current, chart)
        if (!cancelled) {
          setSvg(renderResult.svg)
          setRenderState('ready')
        }
      } catch {
        if (!cancelled) {
          setSvg('')
          setRenderState('failed')
        }
      }
    }

    void renderMermaid()

    return () => {
      cancelled = true
    }
  }, [chart])

  return (
    <figure className="guide-diagram">
      <figcaption>{title}</figcaption>
      {renderState === 'ready' && svg !== '' ? (
        <div className="guide-mermaid" dangerouslySetInnerHTML={{ __html: svg }} />
      ) : renderState === 'loading' ? (
        <div className="guide-diagram-loading" role="status" aria-label="Rendering diagram">
          Rendering diagram...
        </div>
      ) : (
        <pre className="guide-diagram-fallback">
          <code>{chart}</code>
        </pre>
      )}
      {renderState === 'failed' ? <p className="guide-diagram-note">Diagram renderer unavailable; showing Mermaid source fallback.</p> : null}
    </figure>
  )
}

function BenchmarkGuidePanel(): JSX.Element {
  const interactionCaseById = useMemo(() => {
    return new Map(BENCHMARK_INTERACTION_CASES.map((interactionCase) => [interactionCase.id, interactionCase]))
  }, [])

  return (
    <>
      <section className="card guide-card">
        <h2>{BENCHMARK_OVERVIEW.title}</h2>
        <p>{BENCHMARK_OVERVIEW.summary}</p>
        <p>{BENCHMARK_OVERVIEW.datasetNote}</p>
        <h3>Pinned Benchmark Baseline</h3>
        <ul className="guide-reference-list">
          <li>
            Dataset:{' '}
            <a href={BENCHMARK_REFERENCE_PIN.datasetUrl} target="_blank" rel="noreferrer">
              {BENCHMARK_REFERENCE_PIN.datasetName}
            </a>
          </li>
          <li>
            Dataset version: <code>{BENCHMARK_REFERENCE_PIN.datasetVersion}</code>
          </li>
          <li>
            Submodule path: <code>{BENCHMARK_REFERENCE_PIN.submodulePath}</code>
          </li>
          <li>
            Submodule commit: <code>{BENCHMARK_REFERENCE_PIN.submoduleCommit}</code>
          </li>
          <li>
            Paper snapshot: <code>{BENCHMARK_REFERENCE_PIN.benchmarkPaper}</code>
          </li>
        </ul>
        <p className="guide-reference-note">
          This pinned baseline is used as a traceable reference point when upstream benchmark datasets or evaluator code are updated.
        </p>
        <h3>Primary Sources</h3>
        <ul className="guide-source-list">
          {BENCHMARK_OVERVIEW.sourcePaths.map((path) => (
            <li key={path}>
              <code>{path}</code>
            </li>
          ))}
        </ul>
      </section>

      <section className="card guide-card">
        <h3>How Evaluation Works</h3>
        <ol className="guide-flow-list">
          {EVALUATION_FLOW_STEPS.map((step) => (
            <li key={step.id} className="guide-flow-item">
              <h4>{step.title}</h4>
              <p>{step.description}</p>
              <p className="guide-source">
                Source: <code>{step.source}</code>
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="card guide-card">
        <h3>Explorer-to-Evaluation Field Mapping</h3>
        <p>
          This map shows how each explorer section is consumed by the benchmark runtime during dataset preparation, harness execution, and final reporting.
        </p>
        <div className="guide-table-wrap">
          <table className="guide-table guide-table--mapping">
            <thead>
              <tr>
                <th>Explorer Surface</th>
                <th>JSONL Field</th>
                <th>Runtime Consumer</th>
                <th>Evaluation Effect</th>
                <th>Primary Source</th>
              </tr>
            </thead>
            <tbody>
              {EXPLORER_RUNTIME_MAPPINGS.map((mapping) => (
                <tr key={mapping.explorerSurface}>
                  <td>{mapping.explorerSurface}</td>
                  <td>
                    <code>{mapping.benchmarkJsonlField}</code>
                  </td>
                  <td>{mapping.runtimeConsumer}</td>
                  <td>{mapping.outputEffect}</td>
                  <td>
                    <code>{mapping.source}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card guide-card">
        <h3>Category Reference</h3>
        <p>Each category below maps to a concrete evaluation pattern in the benchmark infrastructure.</p>
        <div className="guide-table-wrap">
          <table className="guide-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Task Type</th>
                <th>Availability</th>
                <th>Scoring</th>
                <th>Primary Execution Path</th>
                <th>How It Works</th>
              </tr>
            </thead>
            <tbody>
              {CATEGORY_GUIDE_ROWS.map((category) => (
                <tr key={category.id}>
                  <td>
                    <div className="guide-category-title">
                      <strong>{category.id}</strong>
                      <span>{category.title}</span>
                    </div>
                  </td>
                  <td>
                    <span className={category.taskType === 'code_generation' ? 'guide-chip guide-chip--task-gen' : 'guide-chip guide-chip--task-comp'}>
                      {taskTypeLabel(category.taskType)}
                    </span>
                  </td>
                  <td>
                    <span className={availabilityBadgeClassName(category)}>{availabilityLabel(category.availability)}</span>
                  </td>
                  <td>
                    <span className={scoringBadgeClassName(category)}>{scoringModeLabel(category.scoringMode)}</span>
                  </td>
                  <td>
                    <span className={interactionPathChipClassName(CATEGORY_TO_INTERACTION_CASE[category.id])}>
                      {interactionCaseById.get(CATEGORY_TO_INTERACTION_CASE[category.id])?.title ?? 'Unknown path'}
                    </span>
                  </td>
                  <td>
                    <p className="guide-category-description">{category.description}</p>
                    <p className="guide-category-evaluation">{category.evaluation}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card guide-card">
        <h3>Evaluation Interaction Diagrams</h3>
        <p>
          The following diagrams summarize the main runtime interaction paths implemented in the upstream benchmark repository, including agentic and
          commercial-EDA-specific branches.
        </p>
        <div className="guide-case-grid">
          {BENCHMARK_INTERACTION_CASES.map((interactionCase) => (
            <article key={interactionCase.id} className="guide-case-card">
              <header className="guide-case-header">
                <h4>{interactionCase.title}</h4>
                <span className={interactionPathChipClassName(interactionCase.id)}>{interactionCase.appliesTo}</span>
              </header>
              <p className="guide-case-summary">{interactionCase.summary}</p>
              <p className="guide-case-categories">
                Categories:
                {interactionCase.categories.length === 0 ? ' n/a' : ` ${interactionCase.categories.join(', ')}`}
              </p>
              <MermaidDiagram chart={interactionCase.mermaid} title={`${interactionCase.title} flow`} />
              <p className="guide-case-output">
                Outputs: <span>{interactionCase.outputs}</span>
              </p>
              <p className="guide-source">
                Sources: {interactionCase.sourcePaths.map((source) => <code key={source}>{source}</code>)}
              </p>
            </article>
          ))}
        </div>
      </section>
    </>
  )
}

function App(): JSX.Element {
  const initialUrlState = useMemo(() => readUrlState(), [])

  const [index, setIndex] = useState<IndexItem[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [selectedRecord, setSelectedRecord] = useState<RecordDetail | null>(null)
  const [selection, setSelection] = useState<FileSelection | null>(null)

  const [mainSection, setMainSection] = useState<MainPanelSection>('records')
  const [search, setSearch] = useState(initialUrlState.search)
  const [taskTypeFilter, setTaskTypeFilter] = useState<TaskTypeFilter>(initialUrlState.taskTypeFilter)
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
      setTaskTypeFilter(state.taskTypeFilter)
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
  }, [debouncedSearch, taskTypeFilter, modeFilter, difficultyFilter, datasetFilter, categoryFilter])

  const datasets = useMemo(() => {
    return ['all', ...Array.from(new Set(index.map((item) => item.dataset))).sort()]
  }, [index])

  const taskTypes = useMemo(() => {
    return ['all', ...Array.from(new Set(index.map((item) => item.task_type))).sort()] as TaskTypeFilter[]
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

    if (!taskTypes.includes(taskTypeFilter)) {
      setTaskTypeFilter('all')
    }

    if (!categories.includes(categoryFilter)) {
      setCategoryFilter('all')
    }
  }, [indexLoading, index.length, datasets, taskTypes, categories, datasetFilter, taskTypeFilter, categoryFilter])

  useEffect(() => {
    const currentId = getIdFromUrl()
    const nextUrl = buildExplorerUrl({
      id: currentId,
      search: debouncedSearch,
      taskTypeFilter,
      modeFilter,
      difficultyFilter,
      datasetFilter,
      categoryFilter,
    })
    const currentUrl = `${window.location.pathname}${window.location.search}`
    if (nextUrl !== currentUrl) {
      window.history.replaceState({}, '', nextUrl)
    }
  }, [debouncedSearch, taskTypeFilter, modeFilter, difficultyFilter, datasetFilter, categoryFilter])

  const filtered = useMemo(() => {
    return filterIndexRecords(index, {
      search: debouncedSearch,
      taskTypeFilter,
      modeFilter,
      difficultyFilter,
      datasetFilter,
      categoryFilter,
    })
  }, [index, debouncedSearch, taskTypeFilter, modeFilter, difficultyFilter, datasetFilter, categoryFilter])

  const hierarchySource = useMemo(() => {
    return filterIndexRecords(index, {
      search: debouncedSearch,
      taskTypeFilter: 'all',
      modeFilter: 'all',
      difficultyFilter: 'all',
      datasetFilter,
      categoryFilter: 'all',
    })
  }, [index, debouncedSearch, datasetFilter])

  const hierarchyTree = useMemo(() => {
    return buildFilterHierarchy(hierarchySource)
  }, [hierarchySource])

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

  const clearHierarchyFilters = (): void => {
    setTaskTypeFilter('all')
    setCategoryFilter('all')
    setModeFilter('all')
    setDifficultyFilter('all')
  }

  const applyHierarchyTaskType = (taskType: TaskTypeFilter): void => {
    setTaskTypeFilter(taskType)
    setCategoryFilter('all')
    setModeFilter('all')
    setDifficultyFilter('all')
  }

  const applyHierarchyCategory = (taskType: TaskTypeFilter, category: string): void => {
    setTaskTypeFilter(taskType)
    setCategoryFilter(category)
    setModeFilter('all')
    setDifficultyFilter('all')
  }

  const applyHierarchyMode = (taskType: TaskTypeFilter, category: string, mode: ModeFilter): void => {
    setTaskTypeFilter(taskType)
    setCategoryFilter(category)
    setModeFilter(mode)
    setDifficultyFilter('all')
  }

  const applyHierarchyDifficulty = (taskType: TaskTypeFilter, category: string, mode: ModeFilter, difficulty: string): void => {
    setTaskTypeFilter(taskType)
    setCategoryFilter(category)
    setModeFilter(mode)
    setDifficultyFilter(toDifficultyFilter(difficulty))
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

          <label className="filter-label" htmlFor="task-filter">
            Task Type
          </label>
          <select
            id="task-filter"
            aria-label="Filter by task type"
            value={taskTypeFilter}
            onChange={(e) => setTaskTypeFilter(e.target.value as TaskTypeFilter)}
          >
            {taskTypes.map((taskType) => (
              <option key={taskType} value={taskType}>
                {taskTypeLabel(taskType)}
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

        <section className="hierarchy-nav" aria-label="Hierarchy navigator">
          <div className="hierarchy-header">
            <h2>Hierarchy Navigator</h2>
            <button type="button" className="hierarchy-reset" onClick={clearHierarchyFilters}>
              Reset hierarchy filters
            </button>
          </div>
          <p className="hierarchy-note">Task type -&gt; category -&gt; mode -&gt; difficulty</p>

          {hierarchyTree.length === 0 ? (
            <div className="empty-note">No hierarchy nodes for current dataset/search.</div>
          ) : (
            <ul className="tree-level tree-level-task">
              {hierarchyTree.map((taskNode) => (
                <li key={taskNode.taskType}>
                  <button
                    type="button"
                    className={taskTypeFilter === taskNode.taskType ? 'tree-node active' : 'tree-node'}
                    onClick={() => applyHierarchyTaskType(taskNode.taskType)}
                    aria-label={`Filter task type ${taskTypeLabel(taskNode.taskType)}`}
                  >
                    <MetadataBadge kind="taskType" value={taskNode.taskType} displayValue={taskTypeLabel(taskNode.taskType)} />
                    <span className="tree-count">{taskNode.count}</span>
                  </button>
                  <ul className="tree-level tree-level-category">
                    {taskNode.categories.map((categoryNode) => (
                      <li key={`${taskNode.taskType}-${categoryNode.category}`}>
                        <button
                          type="button"
                          className={
                            taskTypeFilter === taskNode.taskType && categoryFilter === categoryNode.category
                              ? 'tree-node active'
                              : 'tree-node'
                          }
                          onClick={() => applyHierarchyCategory(taskNode.taskType, categoryNode.category)}
                          aria-label={`Filter category ${formatCategoryLabel(categoryNode.category)}`}
                        >
                          <MetadataBadge
                            kind="category"
                            value={categoryNode.category}
                            displayValue={formatCategoryLabel(categoryNode.category)}
                          />
                          <span className="tree-count">{categoryNode.count}</span>
                        </button>
                        <ul className="tree-level tree-level-mode">
                          {categoryNode.modes.map((modeNode) => (
                            <li key={`${taskNode.taskType}-${categoryNode.category}-${modeNode.mode}`}>
                              <button
                                type="button"
                                className={
                                  taskTypeFilter === taskNode.taskType &&
                                  categoryFilter === categoryNode.category &&
                                  modeFilter === modeNode.mode
                                    ? 'tree-node active'
                                    : 'tree-node'
                                }
                                onClick={() => applyHierarchyMode(taskNode.taskType, categoryNode.category, modeNode.mode)}
                                aria-label={`Filter mode ${modeNode.mode}`}
                              >
                                <MetadataBadge kind="mode" value={modeNode.mode} />
                                <span className="tree-count">{modeNode.count}</span>
                              </button>
                              <ul className="tree-level tree-level-difficulty">
                                {modeNode.difficulties.map((difficultyNode) => (
                                  <li
                                    key={`${taskNode.taskType}-${categoryNode.category}-${modeNode.mode}-${difficultyNode.difficulty}`}
                                  >
                                    <button
                                      type="button"
                                      className={
                                        taskTypeFilter === taskNode.taskType &&
                                        categoryFilter === categoryNode.category &&
                                        modeFilter === modeNode.mode &&
                                        difficultyFilter === toDifficultyFilter(difficultyNode.difficulty)
                                          ? 'tree-node active'
                                          : 'tree-node'
                                      }
                                      onClick={() =>
                                        applyHierarchyDifficulty(
                                          taskNode.taskType,
                                          categoryNode.category,
                                          modeNode.mode,
                                          difficultyNode.difficulty,
                                        )
                                      }
                                      aria-label={`Filter difficulty ${difficultyNode.difficulty}`}
                                    >
                                      <MetadataBadge kind="difficulty" value={difficultyNode.difficulty} />
                                      <span className="tree-count">{difficultyNode.count}</span>
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </section>

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
        <section className="panel-switch">
          <button
            type="button"
            className={mainSection === 'records' ? 'panel-switch-button active' : 'panel-switch-button'}
            onClick={() => setMainSection('records')}
          >
            Record Explorer
          </button>
          <button
            type="button"
            className={mainSection === 'benchmark' ? 'panel-switch-button active' : 'panel-switch-button'}
            onClick={() => setMainSection('benchmark')}
          >
            Benchmark Guide
          </button>
        </section>

        {mainSection === 'benchmark' ? (
          <BenchmarkGuidePanel />
        ) : (
          <>
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
                        <FileViewerContent file={selectedFile} />
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
          </>
        )}
      </main>
    </div>
  )
}

export default App
