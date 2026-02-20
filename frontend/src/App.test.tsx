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
})
