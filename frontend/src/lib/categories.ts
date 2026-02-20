const BLEU_SCORING_CATEGORIES = new Set([6, 8])
const LLM_SUBJECTIVE_CATEGORIES = new Set([9, 10])
const COMMERCIAL_EDA_CATEGORIES = new Set([12, 13, 14])
const CODE_GENERATION_CATEGORIES = new Set([2, 3, 4, 5, 7, 12, 13, 14, 16])

function parseCategoryNumber(categoryId: string): number | null {
  const trimmed = categoryId.trim().toLowerCase()
  const match = trimmed.match(/^cid(\d+)$/)
  if (!match) return null
  const parsed = Number.parseInt(match[1], 10)
  return Number.isNaN(parsed) ? null : parsed
}

export function getCategoryDescription(categoryId: string): string {
  const categoryNum = parseCategoryNumber(categoryId)
  if (categoryNum === null) {
    return 'Unclassified category'
  }

  if (BLEU_SCORING_CATEGORIES.has(categoryNum)) {
    return 'Code comprehension, BLEU/ROUGE score-based'
  }

  if (LLM_SUBJECTIVE_CATEGORIES.has(categoryNum)) {
    return 'Code comprehension, LLM subjective score-based'
  }

  if (COMMERCIAL_EDA_CATEGORIES.has(categoryNum)) {
    return 'Code generation, may require commercial EDA tools'
  }

  if (CODE_GENERATION_CATEGORIES.has(categoryNum)) {
    return 'Code generation, threshold scoring'
  }

  return 'Category-specific benchmark tasks'
}

export function formatCategoryLabel(categoryId: string): string {
  return `${categoryId} (${getCategoryDescription(categoryId)})`
}
