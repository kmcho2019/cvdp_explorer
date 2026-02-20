import { describe, expect, it } from 'vitest'
import { buildFilterHierarchy } from './hierarchy'
import type { IndexItem } from './explorer'

const sample: IndexItem[] = [
  {
    id: 'a',
    dataset: 'd1',
    mode: 'agentic',
    task_type: 'code_generation',
    commercial: false,
    category: 'cid003',
    difficulty: 'easy',
    title: 'A',
    has_system_message: false,
    context_file_count: 0,
    harness_file_count: 0,
    target_file_count: 0,
    has_reference_text: false,
    solutions_redacted: false,
  },
  {
    id: 'b',
    dataset: 'd1',
    mode: 'agentic',
    task_type: 'code_generation',
    commercial: false,
    category: 'cid003',
    difficulty: 'medium',
    title: 'B',
    has_system_message: false,
    context_file_count: 0,
    harness_file_count: 0,
    target_file_count: 0,
    has_reference_text: false,
    solutions_redacted: false,
  },
  {
    id: 'c',
    dataset: 'd1',
    mode: 'nonagentic',
    task_type: 'code_generation',
    commercial: false,
    category: 'cid004',
    difficulty: 'hard',
    title: 'C',
    has_system_message: false,
    context_file_count: 0,
    harness_file_count: 0,
    target_file_count: 0,
    has_reference_text: false,
    solutions_redacted: false,
  },
  {
    id: 'd',
    dataset: 'd2',
    mode: 'nonagentic',
    task_type: 'code_comprehension',
    commercial: false,
    category: 'cid009',
    difficulty: 'easy',
    title: 'D',
    has_system_message: false,
    context_file_count: 0,
    harness_file_count: 0,
    target_file_count: 0,
    has_reference_text: false,
    solutions_redacted: false,
  },
]

describe('buildFilterHierarchy', () => {
  it('builds ordered hierarchy with aggregated counts', () => {
    const hierarchy = buildFilterHierarchy(sample)

    expect(hierarchy).toHaveLength(2)
    expect(hierarchy[0].taskType).toBe('code_generation')
    expect(hierarchy[0].count).toBe(3)
    expect(hierarchy[1].taskType).toBe('code_comprehension')
    expect(hierarchy[1].count).toBe(1)

    const generation = hierarchy[0]
    expect(generation.categories.map((node) => node.category)).toEqual(['cid003', 'cid004'])

    const cid003 = generation.categories[0]
    expect(cid003.count).toBe(2)
    expect(cid003.modes).toHaveLength(1)
    expect(cid003.modes[0].mode).toBe('agentic')
    expect(cid003.modes[0].count).toBe(2)
    expect(cid003.modes[0].difficulties.map((node) => node.difficulty)).toEqual(['easy', 'medium'])
  })

  it('orders mode and difficulty using preferred semantic order', () => {
    const input: IndexItem[] = [
      {
        ...sample[0],
        id: 'z',
        mode: 'nonagentic',
        difficulty: 'hard',
      },
      {
        ...sample[0],
        id: 'y',
        mode: 'agentic',
        difficulty: 'medium',
      },
      {
        ...sample[0],
        id: 'x',
        mode: 'agentic',
        difficulty: 'easy',
      },
    ]

    const hierarchy = buildFilterHierarchy(input)
    const root = hierarchy[0].categories[0]
    expect(root.modes.map((node) => node.mode)).toEqual(['agentic', 'nonagentic'])
    expect(root.modes[0].difficulties.map((node) => node.difficulty)).toEqual(['easy', 'medium'])
  })
})
