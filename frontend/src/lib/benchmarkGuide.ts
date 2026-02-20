export type BenchmarkScoringMode = 'threshold' | 'bleu' | 'llm_subjective'

export type BenchmarkCategoryGuide = {
  id: string
  title: string
  taskType: 'code_generation' | 'code_comprehension'
  availability: 'nonagentic_only' | 'agentic_only' | 'both'
  scoringMode: BenchmarkScoringMode
  evaluation: string
  description: string
}

export type EvaluationStep = {
  id: string
  title: string
  description: string
  source: string
}

export const BENCHMARK_OVERVIEW = {
  title: 'Comprehensive Verilog Design Problems (CVDP)',
  summary:
    'CVDP is a hardware-design benchmark with agentic and non-agentic tracks spanning code generation and comprehension tasks. It evaluates model outputs with reproducible Dockerized harness execution and category-aware scoring.',
  datasetNote:
    'The reference paper reports 783 expert-authored datapoints across 13 categories in the initial public release.',
  sourcePaths: [
    'reference/paper/Comprehensive_Verilog_Design_Problems_2506.14074v1_md.md',
    'cvdp_benchmark/run_benchmark.py',
    'cvdp_benchmark/src/dataset_processor.py',
    'cvdp_benchmark/src/constants.py',
    'cvdp_benchmark/src/report.py',
  ],
}

export const EVALUATION_FLOW_STEPS: EvaluationStep[] = [
  {
    id: 'setup',
    title: 'Dataset mode detection and run setup',
    description:
      'The benchmark parses CLI flags, detects agentic/non-agentic mode (or forces conversion), validates commercial EDA requirements, and configures Docker networking.',
    source: 'cvdp_benchmark/run_benchmark.py',
  },
  {
    id: 'parse',
    title: 'JSONL ingestion and datapoint indexing',
    description:
      'Each JSONL line is loaded into an in-memory context keyed by datapoint ID for downstream preparation and execution.',
    source: 'cvdp_benchmark/src/dataset_processor.py::process_json',
  },
  {
    id: 'prepare',
    title: 'Workspace materialization and model/agent preparation',
    description:
      'Datapoint context, harness assets, and expected-output metadata are expanded into per-problem workspaces before execution.',
    source: 'cvdp_benchmark/src/dataset_processor.py::all_prepare',
  },
  {
    id: 'execute',
    title: 'Objective/subjective evaluation dispatch',
    description:
      'Code-generation categories run objective harness tests; comprehension categories route to subjective/score-based evaluators according to category policy.',
    source: 'cvdp_benchmark/src/dataset_processor.py::run',
  },
  {
    id: 'score',
    title: 'Category-aware scoring policy',
    description:
      'Most categories use threshold pass/fail aggregation; comprehension categories cid006/008 (BLEU) and cid009/010 (LLM subjective) are score-based by default.',
    source: 'cvdp_benchmark/src/constants.py',
  },
  {
    id: 'report',
    title: 'Category+difficulty aggregation and reporting',
    description:
      'Raw per-datapoint outcomes are consolidated into category/difficulty summaries and emitted as report artifacts (JSON + text report).',
    source: 'cvdp_benchmark/src/report.py',
  },
]

export const CATEGORY_GUIDE_ROWS: BenchmarkCategoryGuide[] = [
  {
    id: 'cid002',
    title: 'RTL Code Completion',
    taskType: 'code_generation',
    availability: 'nonagentic_only',
    scoringMode: 'threshold',
    evaluation: 'Objective harness pass/fail',
    description: 'Complete skeleton RTL into a full implementation that passes verification harness checks.',
  },
  {
    id: 'cid003',
    title: 'Specification to RTL Translation',
    taskType: 'code_generation',
    availability: 'both',
    scoringMode: 'threshold',
    evaluation: 'Objective harness pass/fail',
    description: 'Generate full RTL directly from a natural-language hardware specification.',
  },
  {
    id: 'cid004',
    title: 'RTL Code Modification',
    taskType: 'code_generation',
    availability: 'both',
    scoringMode: 'threshold',
    evaluation: 'Objective harness pass/fail',
    description: 'Apply requested behavioral/interface modifications to an existing RTL baseline.',
  },
  {
    id: 'cid005',
    title: 'Spec to RTL with Module Reuse',
    taskType: 'code_generation',
    availability: 'agentic_only',
    scoringMode: 'threshold',
    evaluation: 'Objective harness pass/fail',
    description: 'Synthesize RTL from spec while instantiating and composing reusable components.',
  },
  {
    id: 'cid007',
    title: 'RTL Improvement (Lint/QoR)',
    taskType: 'code_generation',
    availability: 'nonagentic_only',
    scoringMode: 'threshold',
    evaluation: 'Objective harness pass/fail',
    description: 'Improve existing RTL for lint cleanliness and quality-of-results constraints.',
  },
  {
    id: 'cid012',
    title: 'Test Plan to Testbench Stimulus',
    taskType: 'code_generation',
    availability: 'both',
    scoringMode: 'threshold',
    evaluation: 'Objective harness pass/fail',
    description: 'Generate stimulus-focused testbench behavior from a verification test plan.',
  },
  {
    id: 'cid013',
    title: 'Test Plan to Testbench Checker',
    taskType: 'code_generation',
    availability: 'both',
    scoringMode: 'threshold',
    evaluation: 'Objective harness pass/fail',
    description: 'Generate checker logic and verification assertions around expected DUT behavior.',
  },
  {
    id: 'cid014',
    title: 'Test Plan to Assertions Generation',
    taskType: 'code_generation',
    availability: 'both',
    scoringMode: 'threshold',
    evaluation: 'Objective harness pass/fail',
    description: 'Create SystemVerilog assertions that enforce test-plan correctness conditions.',
  },
  {
    id: 'cid016',
    title: 'RTL Debugging and Bug Fixing',
    taskType: 'code_generation',
    availability: 'both',
    scoringMode: 'threshold',
    evaluation: 'Objective harness pass/fail',
    description: 'Diagnose failing RTL behavior and patch defects until harness checks pass.',
  },
  {
    id: 'cid006',
    title: 'RTL/Specification Correspondence',
    taskType: 'code_comprehension',
    availability: 'nonagentic_only',
    scoringMode: 'bleu',
    evaluation: 'Score-based BLEU/ROUGE alignment',
    description: 'Match RTL and specification snippets in either direction with textual/code fidelity.',
  },
  {
    id: 'cid008',
    title: 'Testbench/Test-Plan Correspondence',
    taskType: 'code_comprehension',
    availability: 'nonagentic_only',
    scoringMode: 'bleu',
    evaluation: 'Score-based BLEU/ROUGE alignment',
    description: 'Align testbench content with verification test-plan intent and structure.',
  },
  {
    id: 'cid009',
    title: 'Question & Answer on RTL',
    taskType: 'code_comprehension',
    availability: 'nonagentic_only',
    scoringMode: 'llm_subjective',
    evaluation: 'Score-based LLM subjective judging',
    description: 'Answer technical RTL questions grounded in provided design context.',
  },
  {
    id: 'cid010',
    title: 'Question & Answer on Testbench',
    taskType: 'code_comprehension',
    availability: 'nonagentic_only',
    scoringMode: 'llm_subjective',
    evaluation: 'Score-based LLM subjective judging',
    description: 'Answer testbench-focused verification questions from provided artifacts.',
  },
]

export function availabilityLabel(value: BenchmarkCategoryGuide['availability']): string {
  if (value === 'both') return 'Non-agentic + Agentic'
  if (value === 'agentic_only') return 'Agentic only'
  return 'Non-agentic only'
}

export function scoringModeLabel(value: BenchmarkScoringMode): string {
  if (value === 'bleu') return 'BLEU/ROUGE score-based'
  if (value === 'llm_subjective') return 'LLM subjective score-based'
  return 'Threshold pass/fail'
}
