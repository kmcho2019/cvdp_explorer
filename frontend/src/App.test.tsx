/* @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import App from './App'

type MockResponse = {
  ok: boolean
  status: number
  json: () => Promise<unknown>
}

type IndexPayloadItem = {
  id: string
  dataset: string
  mode: 'agentic' | 'nonagentic'
  task_type: 'code_generation' | 'code_comprehension'
  commercial: boolean
  category: string
  difficulty: string
  title: string
  has_system_message: boolean
  context_file_count: number
  harness_file_count: number
  target_file_count: number
  has_reference_text: boolean
  solutions_redacted: boolean
}

type RecordPayload = {
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
  context_files: Array<{ path: string; language: string; content: string; redacted?: boolean }>
  harness_files: Array<{ path: string; language: string; content: string; redacted?: boolean }>
  expected_outputs: {
    target_files: Array<{ path: string; language: string; content: string; redacted?: boolean }>
    response_text: string
    response_redacted: boolean
  }
  raw: {
    source_file: string
  }
}

function mockOkJson(data: unknown): MockResponse {
  return {
    ok: true,
    status: 200,
    json: async () => data,
  }
}

function makeIndexItem(overrides: Partial<IndexPayloadItem> = {}): IndexPayloadItem {
  return {
    id: 'cvdp_agentic_demo_case_0001',
    dataset: 'agentic_code_generation_no_commercial',
    mode: 'agentic',
    task_type: 'code_generation',
    commercial: false,
    category: 'cid001',
    difficulty: 'medium',
    title: 'demo case',
    has_system_message: true,
    context_file_count: 1,
    harness_file_count: 1,
    target_file_count: 1,
    has_reference_text: false,
    solutions_redacted: true,
    ...overrides,
  }
}

function makeRecordPayload(overrides: Partial<RecordPayload> = {}): RecordPayload {
  return {
    meta: {
      id: 'cvdp_agentic_demo_case_0001',
      dataset: 'agentic_code_generation_no_commercial',
      mode: 'agentic',
      task_type: 'code_generation',
      commercial: false,
      category: 'cid001',
      difficulty: 'medium',
      title: 'demo case',
    },
    prompt: {
      system: 'System prompt',
      user: 'User prompt body',
    },
    context_files: [{ path: 'rtl/demo.sv', language: 'systemverilog', content: 'module demo; endmodule' }],
    harness_files: [{ path: 'src/test_runner.py', language: 'python', content: 'print(1)' }],
    expected_outputs: {
      target_files: [{ path: 'rtl/demo.sv', language: 'systemverilog', content: '', redacted: true }],
      response_text: '',
      response_redacted: true,
    },
    raw: {
      source_file: 'cvdp_v1.0.2_agentic_code_generation_no_commercial.jsonl',
    },
    ...overrides,
  }
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  window.history.replaceState({}, '', '/')
})

describe('App', () => {
  it('loads index and record data and renders prompt content', async () => {
    const indexPayload = [makeIndexItem()]
    const recordPayload = makeRecordPayload()

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('data/index.json')) {
        return mockOkJson(indexPayload) as unknown as Response
      }
      if (url.includes('data/records/cvdp_agentic_demo_case_0001.json')) {
        return mockOkJson(recordPayload) as unknown as Response
      }
      return {
        ok: false,
        status: 404,
        json: async () => ({}),
      } as unknown as Response
    })

    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    await screen.findByText('demo case')
    await screen.findByText('User Prompt')
    expect(screen.getByText('User prompt body')).toBeInTheDocument()
    expect(screen.getByText('System prompt')).toBeInTheDocument()
  })

  it('applies semantic badge classes for record metadata', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('data/index.json')) {
        return mockOkJson([makeIndexItem()]) as unknown as Response
      }
      if (url.includes('data/records/cvdp_agentic_demo_case_0001.json')) {
        return mockOkJson(makeRecordPayload()) as unknown as Response
      }
      return { ok: false, status: 404, json: async () => ({}) } as unknown as Response
    })

    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    await screen.findByRole('heading', { level: 2, name: 'demo case' })

    const difficultyBadge = screen
      .getAllByText('medium')
      .find((element) => element.classList.contains('badge--difficulty-medium'))
    expect(difficultyBadge).toBeTruthy()

    const noCommercialBadge = screen.getByText('no-commercial')
    expect(noCommercialBadge).toHaveClass('badge', 'badge--no-commercial')

    const categoryBadge = screen
      .getAllByText('cid001')
      .find((element) => element.classList.contains('badge--category'))
    expect(categoryBadge).toBeTruthy()
  })

  it('renders index error state and supports retry', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    let indexCallCount = 0
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('data/index.json')) {
        indexCallCount += 1
        if (indexCallCount === 1) {
          return { ok: false, status: 500, json: async () => ({}) } as unknown as Response
        }
        return mockOkJson([makeIndexItem()]) as unknown as Response
      }

      if (url.includes('data/records/cvdp_agentic_demo_case_0001.json')) {
        return mockOkJson(makeRecordPayload({ prompt: { system: '', user: 'Prompt' } })) as unknown as Response
      }

      return { ok: false, status: 404, json: async () => ({}) } as unknown as Response
    })

    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    await screen.findByText('Unable to load explorer data')
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    await waitFor(() => {
      expect(screen.getByText('demo case')).toBeInTheDocument()
    })
  })

  it('renders record error state and supports retry of selected record', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    let recordCallCount = 0
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('data/index.json')) {
        return mockOkJson([makeIndexItem()]) as unknown as Response
      }

      if (url.includes('data/records/cvdp_agentic_demo_case_0001.json')) {
        recordCallCount += 1
        if (recordCallCount === 1) {
          return { ok: false, status: 500, json: async () => ({}) } as unknown as Response
        }
        return mockOkJson(makeRecordPayload()) as unknown as Response
      }

      return { ok: false, status: 404, json: async () => ({}) } as unknown as Response
    })

    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    await screen.findByText('Unable to load selected record')
    fireEvent.click(screen.getByRole('button', { name: 'Retry record load' }))

    await waitFor(() => {
      expect(screen.getByText('User prompt body')).toBeInTheDocument()
    })
  })

  it('shows an empty-state message when filters remove all records', async () => {
    const indexPayload = [makeIndexItem()]

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('data/index.json')) {
        return mockOkJson(indexPayload) as unknown as Response
      }
      if (url.includes('data/records/cvdp_agentic_demo_case_0001.json')) {
        return mockOkJson(makeRecordPayload()) as unknown as Response
      }
      return { ok: false, status: 404, json: async () => ({}) } as unknown as Response
    })

    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    await screen.findByText('demo case')
    fireEvent.change(screen.getByLabelText('Search records'), { target: { value: 'no-match-text' } })

    await screen.findByText('No records match current filters.')
  })

  it('shows large-file performance notice for oversized code content', async () => {
    const veryLargeContent = 'x'.repeat(120_500)

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('data/index.json')) {
        return mockOkJson([makeIndexItem()]) as unknown as Response
      }
      if (url.includes('data/records/cvdp_agentic_demo_case_0001.json')) {
        return mockOkJson(
          makeRecordPayload({
            context_files: [
              {
                path: 'rtl/large_module.sv',
                language: 'systemverilog',
                content: veryLargeContent,
              },
            ],
          }),
        ) as unknown as Response
      }
      return { ok: false, status: 404, json: async () => ({}) } as unknown as Response
    })

    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    await screen.findByText(/Large file \(/)
    expect(screen.getByRole('button', { name: 'Enable syntax highlighting' })).toBeInTheDocument()
  })

  it('applies category filter from the sidebar controls', async () => {
    const first = makeIndexItem({
      id: 'cvdp_agentic_demo_case_0001',
      title: 'first record',
      category: 'cid001',
    })
    const second = makeIndexItem({
      id: 'cvdp_agentic_demo_case_0002',
      title: 'second record',
      category: 'cid009',
    })

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('data/index.json')) {
        return mockOkJson([first, second]) as unknown as Response
      }
      if (url.includes('data/records/cvdp_agentic_demo_case_0001.json')) {
        return mockOkJson(
          makeRecordPayload({
            meta: { ...makeRecordPayload().meta, id: 'cvdp_agentic_demo_case_0001', title: 'first record' },
            prompt: { system: 'First system prompt', user: 'First user prompt' },
          }),
        ) as unknown as Response
      }
      if (url.includes('data/records/cvdp_agentic_demo_case_0002.json')) {
        return mockOkJson(
          makeRecordPayload({
            meta: { ...makeRecordPayload().meta, id: 'cvdp_agentic_demo_case_0002', title: 'second record' },
            prompt: { system: 'Second system prompt', user: 'Second user prompt' },
          }),
        ) as unknown as Response
      }
      return { ok: false, status: 404, json: async () => ({}) } as unknown as Response
    })

    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    await screen.findByText('first record')
    fireEvent.change(screen.getByLabelText('Filter by category'), { target: { value: 'cid009' } })

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: 'second record' })).toBeInTheDocument()
      expect(screen.getByText('Second user prompt')).toBeInTheDocument()
    })
  })

  it('virtualizes long record lists and updates visible rows on scroll', async () => {
    const indexPayload = Array.from({ length: 40 }, (_, idx) =>
      makeIndexItem({
        id: `cvdp_agentic_demo_case_${String(idx + 1).padStart(4, '0')}`,
        title: `record ${idx + 1}`,
        category: `cid${String((idx % 10) + 1).padStart(3, '0')}`,
      }),
    )

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('data/index.json')) {
        return mockOkJson(indexPayload) as unknown as Response
      }
      if (url.includes('data/records/cvdp_agentic_demo_case_0001.json')) {
        return mockOkJson(
          makeRecordPayload({
            meta: { ...makeRecordPayload().meta, id: 'cvdp_agentic_demo_case_0001', title: 'record 1' },
          }),
        ) as unknown as Response
      }
      return mockOkJson(makeRecordPayload()) as unknown as Response
    })

    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    await screen.findByText('record 1')
    expect(screen.queryByText('record 40')).not.toBeInTheDocument()

    const list = document.querySelector('.record-list')
    expect(list).toBeTruthy()
    fireEvent.scroll(list as Element, { target: { scrollTop: 3100 } })

    await waitFor(() => {
      expect(screen.getByText('record 30')).toBeInTheDocument()
    })
  })

  it('hydrates selected record and filters from URL query params', async () => {
    window.history.replaceState(
      {},
      '',
      '/?id=cvdp_agentic_demo_case_0002&q=second&mode=agentic&difficulty=medium&dataset=agentic_code_generation_no_commercial&category=cid009',
    )

    const first = makeIndexItem({
      id: 'cvdp_agentic_demo_case_0001',
      title: 'first record',
      category: 'cid001',
    })
    const second = makeIndexItem({
      id: 'cvdp_agentic_demo_case_0002',
      title: 'second record',
      category: 'cid009',
    })

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('data/index.json')) {
        return mockOkJson([first, second]) as unknown as Response
      }
      if (url.includes('data/records/cvdp_agentic_demo_case_0002.json')) {
        return mockOkJson(
          makeRecordPayload({
            meta: { ...makeRecordPayload().meta, id: 'cvdp_agentic_demo_case_0002', title: 'second record', category: 'cid009' },
            prompt: { system: 'System for second', user: 'User prompt for second' },
          }),
        ) as unknown as Response
      }
      return mockOkJson(makeRecordPayload()) as unknown as Response
    })

    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    await screen.findByRole('heading', { level: 2, name: 'second record' })
    expect((screen.getByLabelText('Search records') as HTMLInputElement).value).toBe('second')
    expect((screen.getByLabelText('Filter by mode') as HTMLSelectElement).value).toBe('agentic')
    expect((screen.getByLabelText('Filter by difficulty') as HTMLSelectElement).value).toBe('medium')
    expect((screen.getByLabelText('Filter by dataset') as HTMLSelectElement).value).toBe(
      'agentic_code_generation_no_commercial',
    )
    expect((screen.getByLabelText('Filter by category') as HTMLSelectElement).value).toBe('cid009')
  })

  it('reflects filter and debounced search state in URL query params', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('data/index.json')) {
        return mockOkJson([makeIndexItem()]) as unknown as Response
      }
      if (url.includes('data/records/cvdp_agentic_demo_case_0001.json')) {
        return mockOkJson(makeRecordPayload()) as unknown as Response
      }
      return { ok: false, status: 404, json: async () => ({}) } as unknown as Response
    })

    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    await screen.findByText('demo case')

    fireEvent.change(screen.getByLabelText('Filter by category'), { target: { value: 'cid001' } })
    await waitFor(() => {
      expect(window.location.search).toContain('category=cid001')
    })

    fireEvent.change(screen.getByLabelText('Search records'), { target: { value: 'demo' } })
    await waitFor(() => {
      expect(window.location.search).toContain('q=demo')
      expect(window.location.search).toContain('id=cvdp_agentic_demo_case_0001')
    })

    fireEvent.change(screen.getByLabelText('Search records'), { target: { value: '' } })
    await waitFor(() => {
      expect(window.location.search).not.toContain('q=')
    })
  })
})
