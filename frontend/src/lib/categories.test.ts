import { describe, expect, it } from 'vitest'
import { formatCategoryLabel, getCategoryDescription } from './categories'

describe('getCategoryDescription', () => {
  it('maps BLEU/ROUGE comprehension categories', () => {
    expect(getCategoryDescription('cid006')).toBe('Code comprehension, BLEU/ROUGE score-based')
    expect(getCategoryDescription('cid008')).toBe('Code comprehension, BLEU/ROUGE score-based')
  })

  it('maps LLM subjective comprehension categories', () => {
    expect(getCategoryDescription('cid009')).toBe('Code comprehension, LLM subjective score-based')
    expect(getCategoryDescription('cid010')).toBe('Code comprehension, LLM subjective score-based')
  })

  it('maps commercial EDA-sensitive generation categories', () => {
    expect(getCategoryDescription('cid012')).toBe('Code generation, may require commercial EDA tools')
    expect(getCategoryDescription('cid013')).toBe('Code generation, may require commercial EDA tools')
    expect(getCategoryDescription('cid014')).toBe('Code generation, may require commercial EDA tools')
  })

  it('maps standard generation categories to threshold scoring', () => {
    expect(getCategoryDescription('cid002')).toBe('Code generation, threshold scoring')
    expect(getCategoryDescription('cid016')).toBe('Code generation, threshold scoring')
  })

  it('uses an unclassified fallback for unknown formats', () => {
    expect(getCategoryDescription('category_x')).toBe('Unclassified category')
  })
})

describe('formatCategoryLabel', () => {
  it('formats category with its short description', () => {
    expect(formatCategoryLabel('cid002')).toBe('cid002 (Code generation, threshold scoring)')
  })
})
