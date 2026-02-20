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

export type ExplorerRuntimeMapping = {
  explorerSurface: string
  benchmarkJsonlField: string
  runtimeConsumer: string
  outputEffect: string
  source: string
}

export type BenchmarkInteractionCase = {
  id:
    | 'objective_harness_generation'
    | 'bleu_rouge_comprehension'
    | 'llm_subjective_comprehension'
    | 'agentic_patch_execution'
    | 'agentic_context_heavy_git'
    | 'commercial_eda_overlay'
  title: string
  summary: string
  appliesTo: string
  categories: string[]
  outputs: string
  sourcePaths: string[]
  mermaid: string
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

export const EXPLORER_RUNTIME_MAPPINGS: ExplorerRuntimeMapping[] = [
  {
    explorerSurface: 'System/User Prompt',
    benchmarkJsonlField: 'copilot: input.prompt, agentic: prompt',
    runtimeConsumer: 'DatasetProcessor.create_context() and model/agent prompt construction',
    outputEffect: 'Drives generated patch/response content used for evaluation',
    source: 'cvdp_benchmark/src/dataset_processor.py::create_context',
  },
  {
    explorerSurface: 'Context Files',
    benchmarkJsonlField: 'copilot: input.context, agentic: context',
    runtimeConsumer: 'Repository.prepare() -> restore_files() workspace materialization',
    outputEffect: 'Initial mini-repo state available to model/agent and harness',
    source: 'cvdp_benchmark/src/repository.py::prepare',
  },
  {
    explorerSurface: 'Harness Files',
    benchmarkJsonlField: 'harness.files or harness map',
    runtimeConsumer: 'Repository.obj_harness() docker-compose service execution',
    outputEffect: 'Objective pass/fail test results and per-service logs',
    source: 'cvdp_benchmark/src/repository.py::obj_harness',
  },
  {
    explorerSurface: 'Expected Output Files',
    benchmarkJsonlField: 'copilot: output.context, agentic: patch',
    runtimeConsumer: 'Golden mode direct application or non-golden target expectation parsing',
    outputEffect: 'Reference patch/targets used to validate harness and score outcomes',
    source: 'cvdp_benchmark/src/dataset_processor.py::create_context',
  },
  {
    explorerSurface: 'Reference Response',
    benchmarkJsonlField: 'output.response or subjective_reference',
    runtimeConsumer: 'run_subjective_scoring() -> Repository.sbj()/subjective_score()',
    outputEffect: 'BLEU/ROUGE or LLM-subjective score contribution to report',
    source: 'cvdp_benchmark/src/dataset_processor.py::run_subjective_scoring',
  },
  {
    explorerSurface: 'Per-Problem Evaluation Result',
    benchmarkJsonlField: 'raw_result.json entry',
    runtimeConsumer: 'Report.format_report() category+difficulty aggregation',
    outputEffect: 'report.json/report.txt summary and category-level metrics',
    source: 'cvdp_benchmark/src/report.py::format_report',
  },
]

export const BENCHMARK_INTERACTION_CASES: BenchmarkInteractionCase[] = [
  {
    id: 'objective_harness_generation',
    title: 'Objective Harness Path (Code Generation)',
    summary:
      'Code-generation categories run Dockerized harness services against materialized workspace files and aggregate binary pass/fail outcomes.',
    appliesTo: 'Non-agentic and agentic code-generation evaluations',
    categories: ['cid002', 'cid003', 'cid004', 'cid005', 'cid007', 'cid012', 'cid013', 'cid014', 'cid016'],
    outputs: 'Service logs, objective test results, raw_result.json entry, report aggregates',
    sourcePaths: [
      'cvdp_benchmark/src/dataset_processor.py::run',
      'cvdp_benchmark/src/repository.py::prepare',
      'cvdp_benchmark/src/repository.py::obj_harness',
      'cvdp_benchmark/src/report.py::format_report',
    ],
    mermaid: `flowchart LR
  A["Explorer prompt + context files"] --> B["DatasetProcessor.create_context"]
  B --> C["Repository.prepare writes docs/rtl/verif/src/rundir"]
  C --> D["Repository.obj_harness runs docker-compose services"]
  D --> E["Per-test pass/fail + logs"]
  E --> F["raw_result.json"]
  F --> G["Report.format_report -> report.json/report.txt"]`,
  },
  {
    id: 'bleu_rouge_comprehension',
    title: 'Comprehension BLEU/ROUGE Path',
    summary:
      'Correspondence tasks score textual/code snippet alignment using ROUGE and BLEU with score-based aggregation in reporting.',
    appliesTo: 'Non-agentic code-comprehension correspondence tasks',
    categories: ['cid006', 'cid008'],
    outputs: 'ROUGE/BLEU metric tests and fractional passed-problem scores',
    sourcePaths: [
      'cvdp_benchmark/src/dataset_processor.py::run_subjective_scoring',
      'cvdp_benchmark/src/repository.py::sbj',
      'cvdp_benchmark/src/subjective.py',
      'cvdp_benchmark/src/report.py::format_report',
    ],
    mermaid: `flowchart LR
  A["Prompt + context (RTL/spec or testbench/test-plan)"] --> B["Model response stored in subjective.txt"]
  B --> C["run_subjective_scoring()"]
  C --> D["Repository.sbj -> calculate_ROUGE + calculate_BLEU"]
  D --> E["Score-based category aggregation in Report.format_report"]
  E --> F["report.json category metrics"]`,
  },
  {
    id: 'llm_subjective_comprehension',
    title: 'Comprehension LLM-Subjective Path',
    summary:
      'Q&A comprehension tasks compare candidate response to reference with an LLM judge and aggregate normalized score outcomes.',
    appliesTo: 'Non-agentic Q&A comprehension tasks',
    categories: ['cid009', 'cid010'],
    outputs: 'LLM subjective score tests and fractional passed-problem scores',
    sourcePaths: [
      'cvdp_benchmark/src/dataset_processor.py::run_subjective_scoring',
      'cvdp_benchmark/src/repository.py::subjective_score',
      'cvdp_benchmark/src/llm_lib/subjective_score_model.py',
      'cvdp_benchmark/src/report.py::format_report',
    ],
    mermaid: `flowchart LR
  A["Prompt + context + reference response"] --> B["run_subjective_scoring()"]
  B --> C["Repository.subjective_score"]
  C --> D["SubjectiveScoreModel.chat.completions judge call"]
  D --> E["Normalized llm_score (0..1)"]
  E --> F["Score-based aggregation in report"]`,
  },
  {
    id: 'agentic_patch_execution',
    title: 'Agentic Patch-and-Harness Loop',
    summary:
      'Agentic non-golden mode runs an external agent in Docker, captures workspace deltas, then evaluates resulting files through harness/scoring paths.',
    appliesTo: 'Agentic non-golden runs with configured agent image',
    categories: ['cid003', 'cid004', 'cid005', 'cid012', 'cid013', 'cid014', 'cid016'],
    outputs: 'agent_changes.patch, agent logs, objective/subjective test results',
    sourcePaths: [
      'cvdp_benchmark/src/dataset_processor.py::all_prepare',
      'cvdp_benchmark/src/dataset_processor.py::th_agent',
      'cvdp_benchmark/src/dataset_processor.py::agent_run',
      'cvdp_benchmark/src/dataset_processor.py::run',
    ],
    mermaid: `flowchart LR
  A["Agentic context + prompt.json"] --> B["all_prepare()"]
  B --> C["all_agent()/th_agent runs docker-compose-agent.yml"]
  C --> D["Agent modifies workspace files"]
  D --> E["Diff capture -> agent_changes.patch"]
  E --> F["run() dispatch objective/subjective evaluation"]
  F --> G["raw_result/report artifacts"]`,
  },
  {
    id: 'agentic_context_heavy_git',
    title: 'Context-Heavy Git Workspace Path',
    summary:
      'Context-heavy agentic datapoints build Docker volumes from repo+commit snapshots, apply dataset patches, and evaluate directly against volume-backed workspaces.',
    appliesTo: 'Agentic heavy datapoints with repository+commit metadata',
    categories: ['cid003', 'cid004', 'cid005', 'cid012', 'cid013', 'cid014', 'cid016'],
    outputs: 'Workspace volumes, volume diff patch, harness execution against git snapshot',
    sourcePaths: [
      'cvdp_benchmark/src/dataset_processor.py::create_repo',
      'cvdp_benchmark/src/git_utils.py::create_volume_with_checkout',
      'cvdp_benchmark/src/dataset_processor.py::_generate_volume_changes_patch',
      'cvdp_benchmark/src/repository.py::AgenticRepository.docker_cmd',
    ],
    mermaid: `flowchart LR
  A["context.repo + context.commit"] --> B["GitRepositoryManager.create_volume_with_checkout"]
  B --> C["Docker workspace volume at target commit"]
  C --> D["Agent runs with volume mounted at /code"]
  D --> E["Before/after volume diff -> agent_changes.patch"]
  E --> F["Harness executes against same workspace volume"]`,
  },
  {
    id: 'commercial_eda_overlay',
    title: 'Commercial EDA Network Overlay',
    summary:
      'For commercial-tool datapoints, benchmark validation enforces license-network/image prerequisites and injects external networks into compose flows.',
    appliesTo: 'Datasets/datapoints requiring EDA templates or cid012/cid013/cid014 license paths',
    categories: ['cid012', 'cid013', 'cid014'],
    outputs: 'Validated license network setup and EDA-enabled harness/agent runtime wiring',
    sourcePaths: [
      'cvdp_benchmark/src/commercial_eda.py::validate_commercial_eda_setup',
      'cvdp_benchmark/run_benchmark.py',
      'cvdp_benchmark/src/repository.py::restore_files',
      'cvdp_benchmark/src/dataset_processor.py::agent_run',
    ],
    mermaid: `flowchart LR
  A["Dataset categories + template scan"] --> B["validate_commercial_eda_setup()"]
  B --> C["License network/image checks"]
  C --> D["Compose network injection for harness/agent"]
  D --> E["EDA services run with external license connectivity"]`,
  },
]

export const CATEGORY_TO_INTERACTION_CASE: Record<string, BenchmarkInteractionCase['id']> = {
  cid002: 'objective_harness_generation',
  cid003: 'objective_harness_generation',
  cid004: 'objective_harness_generation',
  cid005: 'objective_harness_generation',
  cid006: 'bleu_rouge_comprehension',
  cid007: 'objective_harness_generation',
  cid008: 'bleu_rouge_comprehension',
  cid009: 'llm_subjective_comprehension',
  cid010: 'llm_subjective_comprehension',
  cid012: 'objective_harness_generation',
  cid013: 'objective_harness_generation',
  cid014: 'objective_harness_generation',
  cid016: 'objective_harness_generation',
}

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
