import { describe, expect, it } from 'vitest'
import {
  BENCHMARK_INTERACTION_CASES,
  CATEGORY_TO_INTERACTION_CASE,
  CATEGORY_GUIDE_ROWS,
  EVALUATION_FLOW_STEPS,
  EXPLORER_RUNTIME_MAPPINGS,
  availabilityLabel,
  scoringModeLabel,
} from './benchmarkGuide'

describe('benchmarkGuide data', () => {
  it('contains all expected CVDP category IDs from v1 release', () => {
    const ids = CATEGORY_GUIDE_ROWS.map((row) => row.id).sort()
    expect(ids).toEqual([
      'cid002',
      'cid003',
      'cid004',
      'cid005',
      'cid006',
      'cid007',
      'cid008',
      'cid009',
      'cid010',
      'cid012',
      'cid013',
      'cid014',
      'cid016',
    ])
  })

  it('includes both objective and score-based category definitions', () => {
    const scoringModes = new Set(CATEGORY_GUIDE_ROWS.map((row) => row.scoringMode))
    expect(scoringModes.has('threshold')).toBe(true)
    expect(scoringModes.has('bleu')).toBe(true)
    expect(scoringModes.has('llm_subjective')).toBe(true)
  })

  it('defines a multi-step evaluation flow sourced from submodule internals', () => {
    expect(EVALUATION_FLOW_STEPS).toHaveLength(6)
    expect(EVALUATION_FLOW_STEPS[0].source).toContain('run_benchmark.py')
    expect(EVALUATION_FLOW_STEPS[EVALUATION_FLOW_STEPS.length - 1].source).toContain('report.py')
  })

  it('maps every category to a primary interaction case', () => {
    const validCaseIds = new Set(BENCHMARK_INTERACTION_CASES.map((item) => item.id))
    const categoryIds = CATEGORY_GUIDE_ROWS.map((row) => row.id)

    for (const categoryId of categoryIds) {
      expect(CATEGORY_TO_INTERACTION_CASE[categoryId]).toBeDefined()
      expect(validCaseIds.has(CATEGORY_TO_INTERACTION_CASE[categoryId])).toBe(true)
    }
  })

  it('defines mermaid diagrams and source paths for each interaction case', () => {
    for (const interaction of BENCHMARK_INTERACTION_CASES) {
      expect(interaction.mermaid.trim()).not.toBe('')
      expect(interaction.sourcePaths.length).toBeGreaterThan(0)
      expect(interaction.outputs.trim()).not.toBe('')
    }
  })

  it('includes explorer-to-runtime field mappings for prompt/context/harness/outputs', () => {
    const surfaces = EXPLORER_RUNTIME_MAPPINGS.map((row) => row.explorerSurface)
    expect(surfaces).toContain('System/User Prompt')
    expect(surfaces).toContain('Context Files')
    expect(surfaces).toContain('Harness Files')
    expect(surfaces).toContain('Expected Output Files')
    expect(surfaces).toContain('Reference Response')
  })
})

describe('benchmarkGuide labels', () => {
  it('maps availability labels', () => {
    expect(availabilityLabel('both')).toBe('Non-agentic + Agentic')
    expect(availabilityLabel('agentic_only')).toBe('Agentic only')
    expect(availabilityLabel('nonagentic_only')).toBe('Non-agentic only')
  })

  it('maps scoring labels', () => {
    expect(scoringModeLabel('threshold')).toBe('Threshold pass/fail')
    expect(scoringModeLabel('bleu')).toBe('BLEU/ROUGE score-based')
    expect(scoringModeLabel('llm_subjective')).toBe('LLM subjective score-based')
  })
})
