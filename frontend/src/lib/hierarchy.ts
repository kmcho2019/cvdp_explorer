import type { IndexItem } from './explorer'

export type TaskTypeNode = {
  taskType: IndexItem['task_type']
  count: number
  categories: CategoryNode[]
}

export type CategoryNode = {
  category: string
  count: number
  modes: ModeNode[]
}

export type ModeNode = {
  mode: IndexItem['mode']
  count: number
  difficulties: DifficultyNode[]
}

export type DifficultyNode = {
  difficulty: string
  count: number
}

const TASK_TYPE_ORDER: ReadonlyArray<IndexItem['task_type']> = ['code_generation', 'code_comprehension']
const MODE_ORDER: ReadonlyArray<IndexItem['mode']> = ['agentic', 'nonagentic']
const DIFFICULTY_ORDER = ['easy', 'medium', 'hard']

function taskOrder(taskType: IndexItem['task_type']): number {
  const idx = TASK_TYPE_ORDER.indexOf(taskType)
  return idx === -1 ? TASK_TYPE_ORDER.length : idx
}

function modeOrder(mode: IndexItem['mode']): number {
  const idx = MODE_ORDER.indexOf(mode)
  return idx === -1 ? MODE_ORDER.length : idx
}

function difficultyOrder(difficulty: string): number {
  const normalized = difficulty.trim().toLowerCase()
  const idx = DIFFICULTY_ORDER.indexOf(normalized)
  return idx === -1 ? DIFFICULTY_ORDER.length : idx
}

function byDifficulty(a: DifficultyNode, b: DifficultyNode): number {
  const rank = difficultyOrder(a.difficulty) - difficultyOrder(b.difficulty)
  return rank !== 0 ? rank : a.difficulty.localeCompare(b.difficulty)
}

function byMode(a: ModeNode, b: ModeNode): number {
  const rank = modeOrder(a.mode) - modeOrder(b.mode)
  return rank !== 0 ? rank : a.mode.localeCompare(b.mode)
}

function byCategory(a: CategoryNode, b: CategoryNode): number {
  return a.category.localeCompare(b.category)
}

function byTaskType(a: TaskTypeNode, b: TaskTypeNode): number {
  const rank = taskOrder(a.taskType) - taskOrder(b.taskType)
  return rank !== 0 ? rank : a.taskType.localeCompare(b.taskType)
}

export function buildFilterHierarchy(records: IndexItem[]): TaskTypeNode[] {
  const taskTypeMap = new Map<IndexItem['task_type'], TaskTypeNode>()

  for (const item of records) {
    let taskNode = taskTypeMap.get(item.task_type)
    if (!taskNode) {
      taskNode = {
        taskType: item.task_type,
        count: 0,
        categories: [],
      }
      taskTypeMap.set(item.task_type, taskNode)
    }
    taskNode.count += 1

    let categoryNode = taskNode.categories.find((node) => node.category === item.category)
    if (!categoryNode) {
      categoryNode = {
        category: item.category,
        count: 0,
        modes: [],
      }
      taskNode.categories.push(categoryNode)
    }
    categoryNode.count += 1

    let modeNode = categoryNode.modes.find((node) => node.mode === item.mode)
    if (!modeNode) {
      modeNode = {
        mode: item.mode,
        count: 0,
        difficulties: [],
      }
      categoryNode.modes.push(modeNode)
    }
    modeNode.count += 1

    let difficultyNode = modeNode.difficulties.find((node) => node.difficulty === item.difficulty)
    if (!difficultyNode) {
      difficultyNode = {
        difficulty: item.difficulty,
        count: 0,
      }
      modeNode.difficulties.push(difficultyNode)
    }
    difficultyNode.count += 1
  }

  const hierarchy = Array.from(taskTypeMap.values())
  for (const taskNode of hierarchy) {
    taskNode.categories.sort(byCategory)
    for (const categoryNode of taskNode.categories) {
      categoryNode.modes.sort(byMode)
      for (const modeNode of categoryNode.modes) {
        modeNode.difficulties.sort(byDifficulty)
      }
    }
  }

  hierarchy.sort(byTaskType)
  return hierarchy
}
