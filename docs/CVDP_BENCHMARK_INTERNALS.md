# CVDP Benchmark Internals (Submodule Deep Dive)

This document explains how the `cvdp_benchmark/` submodule is structured, how benchmark data is represented, and how the repository processes datasets end-to-end.

## 1. Scope and Entry Points

Main scripts:

- `cvdp_benchmark/run_benchmark.py`: single run (full dataset or single `--id`), generates `raw_result.json` + report artifacts.
- `cvdp_benchmark/run_samples.py`: multi-sample orchestration for pass@k style analysis; repeatedly calls benchmark runs and merges reports.
- `cvdp_benchmark/run_reporter.py`: report rendering/analysis (text outputs, summary views).

Shared CLI argument plumbing:

- `cvdp_benchmark/src/argparse_common.py`

Core orchestrators:

- `cvdp_benchmark/src/wrapper.py`
- `cvdp_benchmark/src/dataset_processor.py`
- `cvdp_benchmark/src/repository.py`
- `cvdp_benchmark/src/report.py`

## 2. Repository Structure and Responsibilities

`cvdp_benchmark/src/` modules you care about most:

- `dataset_processor.py`
  - Loads JSONL into in-memory context map.
  - Implements preparation and execution phases.
  - Has two mode-specific processors:
    - `CopilotProcessor` (non-agentic)
    - `AgenticProcessor` (agentic)
- `repository.py`
  - Materializes per-problem harness directories.
  - Writes context/harness files.
  - Runs Docker-based objective harness.
  - Runs subjective scoring (BLEU/ROUGE and optionally LLM-based scoring).
- `wrapper.py`
  - Wrapper classes used by entry points:
    - `CopilotWrapper`
    - `AgenticWrapper`
  - Model construction + optional dataset transformation hooks.
- `data_transformer.py`
  - Converts datasets between copilot/non-agentic and agentic shape when using `--force-agentic` or `--force-copilot`.
- `parallel_executor.py`
  - Threaded task scheduling for prepare/run/refine/agent phases.
- `git_utils.py`
  - Shared git mirror + Docker volume workspace logic for context-heavy agentic problems.
- `report.py`
  - Aggregates `raw_result` into category/difficulty summaries and metadata.

## 3. Benchmark Data Structures

The code supports two primary JSONL formats.

### 3.1 Non-agentic (Copilot) expected shape

Used by `CopilotProcessor`:

```json
{
  "id": "cvdp_copilot_<name>_<nnnn>",
  "categories": ["cidXXX", "easy|medium|hard"],
  "input": {
    "prompt": "...",
    "context": {
      "path": "file content"
    }
  },
  "output": {
    "context": {
      "path": "expected content"
    },
    "response": "optional reference text"
  },
  "harness": {
    "files": {
      "docker-compose.yml": "...",
      "src/...": "..."
    }
  }
}
```

Internal semantics:

- `input.context` is the starting workspace.
- In golden mode, `output.context` is applied as target content.
- In LLM mode, model output is mapped to expected target file names.
- For comprehension-style categories, textual response flows through `subjective.txt` scoring path.

### 3.2 Agentic expected shape

Used by `AgenticProcessor`:

```json
{
  "id": "cvdp_agentic_<name>_<nnnn>",
  "categories": ["cidXXX", "easy|medium|hard"],
  "system_message": "optional",
  "prompt": "...",
  "context": {
    "docs/...": "...",
    "rtl/...": "...",
    "verif/...": "..."
  },
  "patch": {
    "path": "unified diff content"
  },
  "harness": {
    "docker-compose.yml": "...",
    "src/...": "..."
  }
}
```

Internal semantics:

- `context` is materialized into harness workspace + `prompt.json` is injected.
- In golden mode, `patch` is applied to context.
- In non-golden agentic mode, an external agent Docker image modifies files; diffs are captured as `agent_changes.patch`.

### 3.3 Category and scoring behavior

`categories[0]` is category ID (`cidNNN`), `categories[1]` is difficulty.

Scoring mode depends on category constants (`src/constants.py`):

- binary pass/fail problem scoring for most categories.
- score-based aggregation (BLEU/LLM subjective score) for configured categories.

## 4. End-to-End Processing Pipeline

## 4.1 Command and mode selection

`run_benchmark.py` performs:

1. Parse args using `argparse_common`.
2. Optional forced dataset transformation via `DataTransformer` (`--force-agentic` / `--force-copilot`).
3. Validate commercial EDA requirements (`commercial_eda`).
4. Configure Docker network(s).
5. Detect dataset mode by ID pattern (`cvdp_agentic_*` vs copilot) unless forced.
6. Instantiate `AgenticBenchmark` or `CopilotBenchmark`.

## 4.2 Common pipeline phases

Both modes follow this broad flow:

1. `process_json()`
  - Load JSONL into `self.context[id]` map.
2. `all_prepare()`
  - Parallel task phase (`th_prepare` per id).
  - Creates repository folders and writes input/harness artifacts.
3. `all_run()`
  - Parallel execution phase (`th_run` per id).
  - Runs objective harness and/or subjective scoring.
4. Report generation
  - Save raw output to `raw_result.json`.
  - Aggregate with `Report(...)` into `report.json` and text report.

### 4.3 Non-agentic (Copilot) internals

`CopilotProcessor.create_context()` has two branches:

- Golden mode:
  - Copies `input.context`.
  - Applies `output.context` directly (unless `--no-patch`).
  - Adds `subjective.txt` for code-comprehension categories when `output.response` exists.

- LLM mode:
  - Builds a prompt from files + instruction.
  - Uses model helper schema selection based on number of expected output files.
  - Parses model response and maps it into expected files or `subjective.txt`.

Execution uses repository objective harness (`docker-compose.yml` services) and subjective scoring path when applicable.

### 4.4 Agentic internals

`AgenticProcessor` extends behavior with agent execution:

- `all_prepare()` calls base prepare, then `all_agent()` when non-golden.
- `th_agent(id)` runs agent container with `docker-compose-agent.yml`.
- Captures modifications by comparing pre/post file trees (or Docker volumes for context-heavy mode).
- Stores generated patch info (`agent_changes.patch`) and updated context for subsequent harness run.

Agent container mounts are built dynamically and can include:

- project directories (`docs`, `rtl`, `verif`, `rundir`) for normal cases.
- external Docker workspace volume for context-heavy git-backed cases.
- optional `golden_ref_solution.patch` and harness files when include flags are set.

## 5. Context-heavy Agentic Pipeline (Git-backed)

For context-heavy datapoints, the system can build workspace volumes from git commits.

Primary logic:

- `AgenticProcessor.create_repo()` chooses git workflow when repo URL + commit hash exist.
- `git_utils.GitRepositoryManager`:
  - maintains shared bare mirrors (`git_cache/mirrors`).
  - creates Docker volume workspace.
  - checks out target commit in container (`patch_image`).
  - applies dataset patches safely.
- Repository stores `volume_name` and execution scripts target that volume.

This avoids duplicating full source trees across datapoints and keeps repeated runs faster.

## 6. Harness Execution and Scoring

`Repository` handles execution-level details:

- `prepare()`:
  - create issue directories under `<prefix>/cvdp_*/harness/<id>/`.
  - write context/harness files.
  - normalize docker-compose content (template substitutions, network injection, volume filtering).

- `run()`:
  - execute objective harness via `docker compose run` per service.
  - logs stored in `reports/` paths.

- `sbj(response, reference, category, prompt)`:
  - either BLEU/ROUGE metrics or LLM-based subjective scoring depending on category/model config.

The code includes timeout and process-tree kill logic (`DOCKER_TIMEOUT`, `exec_timeout`) and optional directory-size monitoring for runaway disk use.

## 7. Parallelization and Fault Handling

`parallel_executor.py` provides:

- `execute_parallel_simple`: for prep/agent phases.
- `execute_parallel_with_results`: for run phase with result queue.
- `execute_parallel_with_custom_results`: for refinement.

Characteristics:

- queue/worker thread model.
- optional queue timeout controls.
- failed preparation items can be carried as synthetic error results into final report.

## 8. Dataset Transformation Layer

`data_transformer.py` supports format coercion:

- Copilot -> Agentic (`transform_dataset_to_agentic`)
- Agentic -> Copilot (`transform_dataset_to_copilot`)

Used by CLI flags:

- `--force-agentic`
- `--force-copilot`

Important behavior:

- moves prompt/context between top-level and `input/output` forms.
- converts expected outputs to/from patch representation.
- normalizes harness nesting (`harness.files` vs direct map).
- handles `docs/subjective.txt` special-case mapping.

## 9. Reports and Output Artifacts

Per run prefix (default `work/`):

- `raw_result.json`: per-id raw test outcomes.
- `report.json`: aggregated category/difficulty metrics + metadata.
- `report.txt`: text summary (auto-generated by `run_reporter.py`).
- per-problem directories under `cvdp_<name>/harness/<id>/` and `.../reports/`.

Single-issue mode still updates/report-generates from accumulated `raw_result.json`.

`run_samples.py` adds:

- sample subdirectories (`sample_1`, `sample_2`, ...).
- `composite_report.json` + text output with pass@k analysis inputs.

## 10. Practical Notes for Explorer Integration

Given the submodule behavior, Explorer-side assumptions should be:

- Both dataset formats are first-class and convertible.
- Redacted outputs in public datasets are valid states (not parse failures).
- `harness` can be nested (`files`) or flattened.
- Subjective response may appear in `output.response` (copilot) or be materialized as `subjective.txt` during processing.
- Agentic `patch` data can be raw/unified-diff text, and may be empty in public releases.

## 11. Useful Files for Further Inspection

- `cvdp_benchmark/run_benchmark.py`
- `cvdp_benchmark/run_samples.py`
- `cvdp_benchmark/src/dataset_processor.py`
- `cvdp_benchmark/src/repository.py`
- `cvdp_benchmark/src/wrapper.py`
- `cvdp_benchmark/src/data_transformer.py`
- `cvdp_benchmark/src/parallel_executor.py`
- `cvdp_benchmark/src/git_utils.py`
- `cvdp_benchmark/src/report.py`
- `cvdp_benchmark/src/argparse_common.py`
