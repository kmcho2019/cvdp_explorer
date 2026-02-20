import { describe, expect, it } from 'vitest'
import { getBadgeClassName, getBadgeTone } from './badges'

describe('getBadgeTone', () => {
  it('maps difficulty levels to traffic-light tones', () => {
    expect(getBadgeTone('difficulty', 'easy')).toBe('difficulty-easy')
    expect(getBadgeTone('difficulty', 'medium')).toBe('difficulty-medium')
    expect(getBadgeTone('difficulty', 'hard')).toBe('difficulty-hard')
  })

  it('maps core semantic badges to distinct families', () => {
    expect(getBadgeTone('mode', 'agentic')).toBe('mode-agentic')
    expect(getBadgeTone('mode', 'nonagentic')).toBe('mode-nonagentic')
    expect(getBadgeTone('commercial', 'commercial')).toBe('commercial')
    expect(getBadgeTone('commercial', 'no-commercial')).toBe('no-commercial')
    expect(getBadgeTone('category', 'cid001')).toBe('category')
    expect(getBadgeTone('id', 'cvdp_agentic_demo_case_0001')).toBe('record-id')
    expect(getBadgeTone('source', 'cvdp_dataset.jsonl')).toBe('source-file')
  })

  it('returns default for unknown values', () => {
    expect(getBadgeTone('mode', 'unknown')).toBe('default')
    expect(getBadgeTone('difficulty', 'unknown')).toBe('default')
    expect(getBadgeTone('taskType', 'other')).toBe('default')
  })
})

describe('getBadgeClassName', () => {
  it('builds class names using the resolved tone', () => {
    expect(getBadgeClassName('difficulty', 'easy')).toBe('badge badge--difficulty-easy')
  })
})
