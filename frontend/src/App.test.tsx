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

function mockOkJson(data: unknown): MockResponse {
  return {
    ok: true,
    status: 200,
    json: async () => data,
  }
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('App', () => {
  it('loads index and record data and renders prompt content', async () => {
    const indexPayload = [
      {
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
      },
    ]

    const recordPayload = {
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
    }

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

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
      .mockResolvedValueOnce(
        mockOkJson([
          {
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
          },
        ]),
      )
      .mockResolvedValue(
        mockOkJson({
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
          prompt: { system: '', user: 'Prompt' },
          context_files: [],
          harness_files: [],
          expected_outputs: { target_files: [], response_text: '', response_redacted: true },
          raw: { source_file: 'source.jsonl' },
        }),
      )

    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    await screen.findByText('Unable to load explorer data')
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    await waitFor(() => {
      expect(screen.getByText('demo case')).toBeInTheDocument()
    })
  })
})
