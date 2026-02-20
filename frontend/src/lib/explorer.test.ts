import { describe, expect, it } from 'vitest'
import { filterIndexRecords, mapPrismLanguage, type IndexItem } from './explorer'

const sample: IndexItem[] = [
  {
    id: 'cvdp_agentic_demo_0001',
    dataset: 'agentic_code_generation_no_commercial',
    mode: 'agentic',
    task_type: 'code_generation',
    commercial: false,
    category: 'cid001',
    difficulty: 'medium',
    title: 'demo case one',
    has_system_message: true,
    context_file_count: 2,
    harness_file_count: 1,
    target_file_count: 1,
    has_reference_text: false,
    solutions_redacted: true,
  },
  {
    id: 'cvdp_copilot_demo_0002',
    dataset: 'nonagentic_code_comprehension',
    mode: 'nonagentic',
    task_type: 'code_comprehension',
    commercial: false,
    category: 'cid009',
    difficulty: 'easy',
    title: 'golden model identify',
    has_system_message: false,
    context_file_count: 1,
    harness_file_count: 0,
    target_file_count: 0,
    has_reference_text: true,
    solutions_redacted: false,
  },
]

describe('mapPrismLanguage', () => {
  it('maps expected aliases', () => {
    expect(mapPrismLanguage('systemverilog')).toBe('verilog')
    expect(mapPrismLanguage('batch')).toBe('bash')
    expect(mapPrismLanguage('text')).toBe('none')
    expect(mapPrismLanguage('python')).toBe('python')
  })
})

describe('filterIndexRecords', () => {
  it('returns all records when filters are default', () => {
    const result = filterIndexRecords(sample, {
      search: '',
      modeFilter: 'all',
      difficultyFilter: 'all',
      datasetFilter: 'all',
    })
    expect(result).toHaveLength(2)
  })

  it('filters by mode and difficulty', () => {
    const result = filterIndexRecords(sample, {
      search: '',
      modeFilter: 'nonagentic',
      difficultyFilter: 'easy',
      datasetFilter: 'all',
    })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('cvdp_copilot_demo_0002')
  })

  it('filters by search term across index fields', () => {
    const result = filterIndexRecords(sample, {
      search: 'golden',
      modeFilter: 'all',
      difficultyFilter: 'all',
      datasetFilter: 'all',
    })
    expect(result).toHaveLength(1)
    expect(result[0].title).toContain('golden model')
  })

  it('filters by dataset', () => {
    const result = filterIndexRecords(sample, {
      search: '',
      modeFilter: 'all',
      difficultyFilter: 'all',
      datasetFilter: 'agentic_code_generation_no_commercial',
    })
    expect(result).toHaveLength(1)
    expect(result[0].mode).toBe('agentic')
  })

  it('applies all filters together', () => {
    const result = filterIndexRecords(sample, {
      search: 'demo',
      modeFilter: 'agentic',
      difficultyFilter: 'medium',
      datasetFilter: 'agentic_code_generation_no_commercial',
    })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('cvdp_agentic_demo_0001')
  })
})
