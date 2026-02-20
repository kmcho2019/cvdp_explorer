export type BadgeKind = 'mode' | 'difficulty' | 'commercial' | 'category' | 'taskType' | 'dataset' | 'id' | 'source'

export type BadgeTone =
  | 'default'
  | 'mode-agentic'
  | 'mode-nonagentic'
  | 'difficulty-easy'
  | 'difficulty-medium'
  | 'difficulty-hard'
  | 'commercial'
  | 'no-commercial'
  | 'category'
  | 'task-generation'
  | 'task-comprehension'
  | 'dataset'
  | 'record-id'
  | 'source-file'

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '_')
}

export function getBadgeTone(kind: BadgeKind, value: string): BadgeTone {
  const token = normalizeToken(value)

  switch (kind) {
    case 'mode':
      if (token === 'agentic') return 'mode-agentic'
      if (token === 'nonagentic') return 'mode-nonagentic'
      return 'default'

    case 'difficulty':
      if (token === 'easy') return 'difficulty-easy'
      if (token === 'medium') return 'difficulty-medium'
      if (token === 'hard') return 'difficulty-hard'
      return 'default'

    case 'commercial':
      if (token === 'commercial') return 'commercial'
      if (token === 'no-commercial' || token === 'no_commercial') return 'no-commercial'
      return 'default'

    case 'category':
      return 'category'

    case 'taskType':
      if (token === 'code_generation') return 'task-generation'
      if (token === 'code_comprehension') return 'task-comprehension'
      return 'default'

    case 'dataset':
      return 'dataset'

    case 'id':
      return 'record-id'

    case 'source':
      return 'source-file'

    default:
      return 'default'
  }
}

export function getBadgeClassName(kind: BadgeKind, value: string): string {
  return `badge badge--${getBadgeTone(kind, value)}`
}
