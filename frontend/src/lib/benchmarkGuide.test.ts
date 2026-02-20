import { describe, expect, it } from 'vitest'
import {
  CATEGORY_GUIDE_ROWS,
  EVALUATION_FLOW_STEPS,
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
