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

function CodeBlock({ file }: { file: FileEntry }): JSX.Element {
  const prismLanguage = mapPrismLanguage(file.language)
  const grammar = prismLanguage === 'none' ? undefined : Prism.languages[prismLanguage]
  const escaped = file.content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const html = grammar ? Prism.highlight(file.content, grammar, prismLanguage) : escaped

  return (
    <pre className={`code-panel language-${prismLanguage}`}>
      <code dangerouslySetInnerHTML={{ __html: html }} />
    </pre>
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

  useEffect(() => {
    fetch('./data/index.json')
      .then((res) => res.json())
      .then((data: IndexItem[]) => {
        setIndex(data)
        const fromUrl = new URLSearchParams(window.location.search).get('id')
        const firstId = fromUrl && data.some((d) => d.id === fromUrl) ? fromUrl : data[0]?.id
        if (firstId) {
          setSelectedId(firstId)
        }
      })
      .catch((err) => {
        console.error('Failed to load index:', err)
      })
  }, [])

  useEffect(() => {
    if (!selectedId) return
    const params = new URLSearchParams(window.location.search)
    params.set('id', selectedId)
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`)

    fetch(`./data/records/${selectedId}.json`)
      .then((res) => res.json())
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
      .catch((err) => {
        console.error('Failed to load record:', err)
      })
  }, [selectedId])

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

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <header className="sidebar-header">
          <h1>CVDP Explorer</h1>
          <p>{filtered.length} records</p>
        </header>

        <div className="filters">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search id/title/category..." />
          <select value={datasetFilter} onChange={(e) => setDatasetFilter(e.target.value)}>
            {datasets.map((dataset) => (
              <option key={dataset} value={dataset}>
                {dataset}
              </option>
            ))}
          </select>
          <select value={modeFilter} onChange={(e) => setModeFilter(e.target.value as 'all' | 'agentic' | 'nonagentic')}>
            <option value="all">all modes</option>
            <option value="agentic">agentic</option>
            <option value="nonagentic">nonagentic</option>
          </select>
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value as 'all' | 'easy' | 'medium' | 'hard')}
          >
            <option value="all">all difficulty</option>
            <option value="easy">easy</option>
            <option value="medium">medium</option>
            <option value="hard">hard</option>
          </select>
        </div>

        <ul className="record-list">
          {filtered.map((item) => (
            <li key={item.id}>
              <button className={item.id === selectedId ? 'record-item active' : 'record-item'} onClick={() => setSelectedId(item.id)}>
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
        {selectedRecord ? (
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
        ) : (
          <section className="card">
            <h2>Loading...</h2>
            <p>Waiting for dataset index.</p>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
