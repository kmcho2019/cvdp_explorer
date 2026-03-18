import { describe, expect, it, vi } from 'vitest'
import { buildFileCopyText, buildProblemBundleText, buildPromptCopyText, copyTextToClipboard } from './problemCopy'

type ProblemFile = {
  path: string
  language: string
  content: string
  redacted?: boolean
}

type ProblemRecord = {
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
  context_files: ProblemFile[]
  harness_files: ProblemFile[]
  expected_outputs: {
    target_files: ProblemFile[]
    response_text: string
    response_redacted: boolean
  }
  raw: {
    source_file: string
  }
}

describe('buildPromptCopyText', () => {
  it('returns raw system prompt markdown without extra wrapping', () => {
    const result = buildPromptCopyText({ kind: 'system', content: 'System `markdown`' })
    expect(result).toBe('System `markdown`')
  })

  it('returns raw user prompt markdown without extra wrapping', () => {
    const result = buildPromptCopyText({ kind: 'user', content: 'User body\nline2' })
    expect(result).toBe('User body\nline2')
  })
})

describe('buildFileCopyText', () => {
  it('returns raw file content', () => {
    const result = buildFileCopyText({ path: 'rtl/demo.sv', language: 'systemverilog', content: 'module demo;' })
    expect(result).toBe('module demo;')
  })

  it('returns raw redacted file text (no wrapper metadata)', () => {
    const result = buildFileCopyText({
      path: 'expected.sv',
      language: 'systemverilog',
      content: '',
      redacted: true,
    })
    expect(result).toBe('')
  })
})

describe('buildProblemBundleText', () => {
  const makeRecord = (): ProblemRecord => ({
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
      user: 'User prompt',
    },
    context_files: [{ path: 'context/a.txt', language: 'text', content: 'CTX' }],
    harness_files: [{ path: 'harness/run.py', language: 'python', content: 'print(1)' }],
    expected_outputs: {
      target_files: [{ path: 'expected/out.sv', language: 'systemverilog', content: 'module out; endmodule' }],
      response_text: 'Expected response text',
      response_redacted: false,
    },
    raw: {
      source_file: 'source.jsonl',
    },
  })

  it('builds a complete markdown problem bundle', () => {
    const record = makeRecord()
    const bundle = buildProblemBundleText(record)

    expect(bundle).toContain('## Metadata')
    expect(bundle).toContain('- ID: cvdp_agentic_demo_case_0001')
    expect(bundle).toContain('## Input')
    expect(bundle).toContain('### Prompts')
    expect(bundle).toContain('### File: context/a.txt')
    expect(bundle).toContain('### File: harness/run.py')
    expect(bundle).toContain('## Expected Output')
    expect(bundle).toContain('Reference Response')
    expect(bundle).toContain('Expected response text')
    expect(bundle).toContain('### Target Files')
    expect(bundle).toContain('### File: expected/out.sv')
    expect(bundle).toContain('module out; endmodule')
  })

  it('builds a redacted-output bundle without leaking reference response text', () => {
    const record = makeRecord()
    record.expected_outputs.response_redacted = true
    const bundle = buildProblemBundleText(record)

    expect(bundle).toContain('Reference response is redacted in this dataset release.')
    expect(bundle).not.toContain('Expected response text')
  })
})

describe('copyTextToClipboard', () => {
  it('throws when clipboard API is unavailable', async () => {
    const originalClipboard = globalThis.navigator.clipboard
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: undefined,
      configurable: true,
    })

    try {
      await expect(copyTextToClipboard('value')).rejects.toMatchObject({
        message: 'Clipboard API is unavailable in this environment.',
        code: 'clipboard_unavailable',
      })
    } finally {
      Object.defineProperty(globalThis.navigator, 'clipboard', {
        value: originalClipboard,
        configurable: true,
      })
    }
  })

  it('throws a write-failed error when writeText rejects', async () => {
    const originalClipboard = globalThis.navigator.clipboard
    const writeText = vi.fn().mockRejectedValue(new Error('write blocked'))

    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })

    try {
      await expect(copyTextToClipboard('value')).rejects.toMatchObject({
        message: 'write blocked',
        code: 'clipboard_write_failed',
      })
      expect(writeText).toHaveBeenCalledWith('value')
    } finally {
      Object.defineProperty(globalThis.navigator, 'clipboard', {
        value: originalClipboard,
        configurable: true,
      })
    }
  })
})
