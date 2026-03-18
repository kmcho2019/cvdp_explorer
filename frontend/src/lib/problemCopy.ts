export type CopyTextError = 'clipboard_unavailable' | 'clipboard_write_failed'

export type PromptCopyKind = 'system' | 'user'

type PromptCopyInput = {
  kind: PromptCopyKind
  content: string
}

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

function fileLinePrefix(redacted: boolean): string {
  return redacted ? ' (redacted)' : ''
}

function appendLines(target: string[], source: string): void {
  target.push(source)
}

function appendSectionHeader(lines: string[], title: string): void {
  appendLines(lines, `## ${title}`)
}

function appendSubSectionHeader(lines: string[], title: string): void {
  appendLines(lines, `### ${title}`)
}

function appendBlankLine(lines: string[]): void {
  appendLines(lines, '')
}

export async function copyTextToClipboard(text: string): Promise<void> {
  if (typeof globalThis.navigator === 'undefined' || !globalThis.navigator.clipboard || typeof globalThis.navigator.clipboard.writeText !== 'function') {
    const error = new Error('Clipboard API is unavailable in this environment.')
    ;(error as Error & { code: CopyTextError }).code = 'clipboard_unavailable'
    throw error
  }

  try {
    await globalThis.navigator.clipboard.writeText(text)
  } catch (error) {
    const copiedError = error instanceof Error ? error : new Error('Clipboard write failed')
    ;(copiedError as Error & { code: CopyTextError }).code = 'clipboard_write_failed'
    throw copiedError
  }
}

export function buildPromptCopyText(input: PromptCopyInput): string {
  return input.content
}

export function buildFileCopyText(file: ProblemFile): string {
  return file.content
}

export function buildProblemBundleText(record: ProblemRecord): string {
  const lines: string[] = []

  appendSectionHeader(lines, 'Problem Export')
  appendBlankLine(lines)

  appendSectionHeader(lines, 'Metadata')
  appendLines(lines, `- ID: ${record.meta.id}`)
  appendLines(lines, `- Title: ${record.meta.title}`)
  appendLines(lines, `- Dataset: ${record.meta.dataset}`)
  appendLines(lines, `- Mode: ${record.meta.mode}`)
  appendLines(lines, `- Task Type: ${record.meta.task_type}`)
  appendLines(lines, `- Difficulty: ${record.meta.difficulty}`)
  appendLines(lines, `- Category: ${record.meta.category}`)
  appendLines(lines, `- Commercial: ${record.meta.commercial ? 'yes' : 'no'}`)
  appendLines(lines, `- Source File: ${record.raw.source_file}`)
  appendBlankLine(lines)

  appendSectionHeader(lines, 'Input')
  appendSubSectionHeader(lines, 'Prompts')
  appendLines(lines, '### System Prompt')
  appendLines(lines, buildPromptCopyText({ kind: 'system', content: record.prompt.system }))
  appendBlankLine(lines)
  appendLines(lines, '### User Prompt')
  appendLines(lines, buildPromptCopyText({ kind: 'user', content: record.prompt.user }))

  appendSubSectionHeader(lines, 'Context Files')
  if (record.context_files.length === 0) {
    appendLines(lines, '- No context files.')
  } else {
    record.context_files.forEach((file) => {
      appendLines(lines, `### File: ${file.path}${fileLinePrefix(!!file.redacted)}`)
      appendLines(lines, '```text')
      appendLines(lines, buildFileCopyText(file))
      appendLines(lines, '```')
      appendBlankLine(lines)
    })
  }
  appendBlankLine(lines)

  appendSectionHeader(lines, 'Evaluation Environment')
  appendSubSectionHeader(lines, 'Harness Files')
  if (record.harness_files.length === 0) {
    appendLines(lines, '- No harness files.')
  } else {
    record.harness_files.forEach((file) => {
      appendLines(lines, `### File: ${file.path}${fileLinePrefix(!!file.redacted)}`)
      appendLines(lines, '```text')
      appendLines(lines, buildFileCopyText(file))
      appendLines(lines, '```')
      appendBlankLine(lines)
    })
  }
  appendBlankLine(lines)

  appendSectionHeader(lines, 'Expected Output')
  appendSubSectionHeader(lines, 'Reference Response')
  if (record.expected_outputs.response_redacted) {
    appendLines(lines, 'Reference response is redacted in this dataset release.')
  } else {
    appendLines(lines, record.expected_outputs.response_text)
  }
  appendBlankLine(lines)

  appendSubSectionHeader(lines, 'Target Files')
  if (record.expected_outputs.target_files.length === 0) {
    appendLines(lines, '- No target files.')
  } else {
    record.expected_outputs.target_files.forEach((file) => {
      appendLines(lines, `### File: ${file.path}${fileLinePrefix(!!file.redacted)}`)
      appendLines(lines, '```text')
      appendLines(lines, buildFileCopyText(file))
      appendLines(lines, '```')
      appendBlankLine(lines)
    })
  }

  return lines.join('\n')
}
