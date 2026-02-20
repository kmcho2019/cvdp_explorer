export type IndexItem = {
  id: string
  dataset: string
  mode: 'agentic' | 'nonagentic'
  task_type: 'code_generation' | 'code_comprehension'
  commercial: boolean
  category: string
  difficulty: string
  title: string
  has_system_message: boolean
  context_file_count: number
  harness_file_count: number
  target_file_count: number
  has_reference_text: boolean
  solutions_redacted: boolean
}

export function mapPrismLanguage(language: string): string {
  switch (language) {
    case 'systemverilog':
      return 'verilog'
    case 'batch':
      return 'bash'
    case 'text':
      return 'none'
    default:
      return language
  }
}

export type FilterOptions = {
  search: string
  modeFilter: 'all' | 'agentic' | 'nonagentic'
  difficultyFilter: 'all' | 'easy' | 'medium' | 'hard'
  datasetFilter: string
}

export function filterIndexRecords(index: IndexItem[], options: FilterOptions): IndexItem[] {
  const term = options.search.trim().toLowerCase()
  return index.filter((item) => {
    if (options.modeFilter !== 'all' && item.mode !== options.modeFilter) return false
    if (options.difficultyFilter !== 'all' && item.difficulty !== options.difficultyFilter) return false
    if (options.datasetFilter !== 'all' && item.dataset !== options.datasetFilter) return false
    if (!term) return true
    return [item.id, item.title, item.category, item.dataset].some((value) => value.toLowerCase().includes(term))
  })
}
