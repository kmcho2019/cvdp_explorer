# CVDP Benchmark Explorer: Software Specification and Development Plan

## 1. Repository Baseline (Current State)

- Working directory: `/workspaces/cvdp_explorer`
- Runtime verification completed:
  - Python `3.12.12`
  - Node `v20.20.0`
  - npm `11.10.1`
- Submodule status:
  - `cvdp_benchmark` is initialized (`6b1147d...`, `heads/main`)
- Current skeleton gaps:
  - `data/scripts/` exists but contains no implementation yet.
  - `frontend/` currently only contains a minimal `package-lock.json`.
  - `.github/workflows/deploy.yml` exists but is empty.

## 2. Dataset and Data Model Analysis

### 2.1 Raw Files Present

`data/raw/` currently contains 5 JSONL datasets:

- `cvdp_v1.0.2_agentic_code_generation_no_commercial.jsonl` (92 rows)
- `cvdp_v1.0.2_agentic_code_generation_commercial.jsonl` (68 rows)
- `cvdp_v1.0.2_nonagentic_code_generation_no_commercial.jsonl` (302 rows)
- `cvdp_v1.0.2_nonagentic_code_generation_commercial.jsonl` (187 rows)
- `cvdp_v1.0.2_nonagentic_code_comprehension.jsonl` (123 rows)

Total: `772` benchmark items, ~`15 MB` raw JSONL.

### 2.2 Observed Source Shapes

Two source schemas exist.

1. Agentic format (`cvdp_agentic_*` IDs):
- top-level fields: `id`, `categories`, `system_message`, `prompt`, `context`, `patch`, `harness`

2. Non-agentic format (`cvdp_copilot_*` IDs):
- top-level fields: `id`, `categories`, `input`, `output`, `harness`
- `input` contains `prompt`, `context` (and optional `comments`)
- `output` contains `response`, `context`
- `harness` usually contains nested `files`

### 2.3 Key Behavioral Finding (Must Handle)

Reference solutions are redacted in current public files:

- Agentic `patch[*]` entries exist but are empty strings.
- Non-agentic generation `output.context[*]` exists but file contents are empty strings.
- Non-agentic comprehension has non-empty `output.response` text.

This is consistent with the upstream benchmark note that reference solutions were omitted from the initial public release.

## 3. Data Pipeline Specification

### 3.1 Pipeline Goal

Convert heterogeneous JSONL records into a stable frontend format optimized for:

- fast list/filter/search in sidebar
- lazy loading of heavy prompt/context/harness text
- consistent rendering regardless of agentic/non-agentic origin

### 3.2 Processing Inputs/Outputs

Input:
- `data/raw/*.jsonl`

Output (proposed):
- `frontend/public/data/index.json`
- `frontend/public/data/records/<id>.json` (one file per datapoint)
- optional: `frontend/public/data/stats.json`

### 3.3 Normalized Frontend Schema

`index.json` item shape (lightweight):

```json
{
  "id": "cvdp_agentic_64b66b_codec_0001",
  "dataset": "agentic_code_generation_no_commercial",
  "mode": "agentic",
  "task_type": "code_generation",
  "commercial": false,
  "category": "cid005",
  "difficulty": "medium",
  "title": "64b66b codec",
  "has_system_message": true,
  "context_file_count": 4,
  "harness_file_count": 4,
  "target_file_count": 1,
  "has_reference_text": false,
  "solutions_redacted": true
}
```

`records/<id>.json` shape (full detail):

```json
{
  "meta": {
    "id": "...",
    "dataset": "...",
    "mode": "agentic|nonagentic",
    "task_type": "code_generation|code_comprehension",
    "commercial": true,
    "category": "cid012",
    "difficulty": "medium"
  },
  "prompt": {
    "system": "...",
    "user": "..."
  },
  "context_files": [
    { "path": "rtl/foo.sv", "language": "systemverilog", "content": "..." }
  ],
  "harness_files": [
    { "path": "src/test_runner.py", "language": "python", "content": "..." }
  ],
  "expected_outputs": {
    "target_files": [
      { "path": "rtl/top.sv", "content": "", "redacted": true }
    ],
    "response_text": "",
    "response_redacted": true
  },
  "raw": {
    "source_file": "cvdp_v1.0.2_agentic_code_generation_no_commercial.jsonl"
  }
}
```

### 3.4 Exact Field Mapping Rules

#### Agentic -> normalized

- `meta.id` <- `id`
- `meta.mode` <- `"agentic"`
- `meta.task_type` <- `"code_generation"`
- `meta.category` <- `categories[0]`
- `meta.difficulty` <- `categories[1]`
- `prompt.system` <- `system_message`
- `prompt.user` <- `prompt`
- `context_files` <- flatten `context` dict into `{path, content}`
- `harness_files` <- flatten `harness` dict into `{path, content}`
- `expected_outputs.target_files` <- flatten `patch` keys as target paths
  - `content` <- patch value
  - `redacted` <- `true` when content empty
- `expected_outputs.response_text` <- `""`
- `expected_outputs.response_redacted` <- `true`

#### Non-agentic -> normalized

- `meta.id` <- `id`
- `meta.mode` <- `"nonagentic"`
- `meta.task_type` <- if source filename contains `code_comprehension` then `"code_comprehension"`, else `"code_generation"`
- `meta.category` <- `categories[0]`
- `meta.difficulty` <- `categories[1]`
- `prompt.system` <- `""`
- `prompt.user` <- `input.prompt`
- `context_files` <- flatten `input.context` dict
- `harness_files` <- flatten `harness.files` when present, else flatten `harness`
- `expected_outputs.target_files` <- flatten `output.context`
  - `redacted` <- `true` when file content empty
- `expected_outputs.response_text` <- `output.response`
- `expected_outputs.response_redacted` <- `true` when empty

### 3.5 Language Inference for Syntax Highlighting

Use extension-based map during preprocessing:

- `.sv`, `.v`, `.vh` -> `systemverilog`
- `.py` -> `python`
- `.md` -> `markdown`
- `.yml` -> `yaml`
- `.tcl` -> `tcl`
- `.cmd` -> `batch`
- dotfiles (`.env`, etc.) -> `bash` fallback
- unknown -> `text`

### 3.6 Data Script Contract

Create `data/scripts/process_cvdp.py` with CLI:

```bash
python process_cvdp.py \
  --input-dir ../raw \
  --output-dir ../../frontend/public/data
```

Responsibilities:

- parse all `.jsonl` files line-by-line
- normalize each datapoint
- write `records/<id>.json`
- write `index.json` sorted by `id`
- produce deterministic output (stable key ordering)
- fail fast on malformed JSON with clear file/line error

## 4. UI/UX Specification and Component Tree

### 4.1 UX Goals

- Fast exploration of 772 entries with minimal initial load.
- Readable multi-turn prompt/context with markdown and syntax highlight.
- Clear signaling when reference outputs are redacted.

### 4.2 Proposed Frontend Stack

- React + Vite + TypeScript
- Markdown: `react-markdown` + `remark-gfm`
- Code rendering: `react-syntax-highlighter` (Prism flavor) or `prismjs`
- State: React hooks + context (no external state manager initially)

### 4.3 Component Tree

- `App`
- `ExplorerLayout`
- `Sidebar`
- `FilterBar`
- `DatasetFilter`
- `ModeFilter`
- `CategoryFilter`
- `DifficultyFilter`
- `SearchBox`
- `BenchmarkList`
- `BenchmarkListItem`
- `MainPanel`
- `RecordHeader`
- `MetaChips`
- `PromptSection`
- `MarkdownBlock`
- `FileSection`
- `FileTree`
- `FileViewer`
- `CodeBlock`
- `ExpectedOutputSection`
- `RedactionBanner`
- `LoadingState`
- `ErrorState`

### 4.4 Route and State Model

- Default route: `/` with selected record from query param `?id=...`
- Keep selected record, filters, and search query in URL params for shareable links.
- Data flow:
  - app boot fetches `index.json`
  - sidebar interactions filter in-memory index
  - selecting row lazy-loads `/data/records/<id>.json`

## 5. Deployment Strategy (GitHub Pages)

Current state: `.github/workflows/deploy.yml` is empty.

### 5.1 Required Workflow Behavior

On push to `main` (and manual dispatch):

1. Checkout with submodules:
- `actions/checkout@v4` with `submodules: recursive`

2. Setup runtimes:
- `actions/setup-python@v5` (`3.12`)
- `actions/setup-node@v4` (`20`, npm cache)

3. Build processed data:
- `pip install -r data/scripts/requirements.txt`
- `python data/scripts/process_cvdp.py`

4. Build frontend:
- `npm ci` in `frontend/`
- `npm run build`

5. Deploy to Pages:
- `actions/configure-pages@v5`
- `actions/upload-pages-artifact@v3` (from `frontend/dist`)
- `actions/deploy-pages@v4`

### 5.2 Vite Base Path Requirement

For project pages (`https://<user>.github.io/<repo>/`), set Vite `base` to `/<repo>/` in production builds (or inject from env). If omitted, JS/CSS asset URLs can 404.

## 6. Implementation Phases and Milestones

### Phase 0: Bootstrap and Validation

Deliverables:
- initialize `frontend/` with Vite React TS app
- add `data/scripts/requirements.txt` and parser scaffold
- add CI workflow scaffold

Exit criteria:
- `npm run dev` works
- `python data/scripts/process_cvdp.py --help` works

### Phase 1: Data Parsing + Normalization

Deliverables:
- full `process_cvdp.py` implementation
- generated `frontend/public/data/index.json`
- generated `frontend/public/data/records/*.json`

Exit criteria:
- all 772 records processed
- parser idempotent (same outputs across runs)
- redaction flags correct

### Phase 2: Core Explorer UI

Deliverables:
- sidebar list + filters + search
- main panel with prompt/context/harness sections
- lazy record loading

Exit criteria:
- user can navigate dataset and open any item without reload

### Phase 3: Rich Rendering

Deliverables:
- markdown rendering for prompts/responses
- syntax highlighting for code/document files
- file tree + viewer tabs
- redaction banners in expected outputs

Exit criteria:
- file rendering works for `.sv`, `.py`, `.md`, `.yml` and fallback types

### Phase 4: Performance + UX Hardening

Deliverables:
- virtualized list for sidebar
- debounced search
- loading/error states
- URL state persistence

Exit criteria:
- smooth scrolling/filtering on low-end laptop class hardware
- no blocking UI when loading record details

### Phase 5: CI/CD + Release

Deliverables:
- production GitHub Actions workflow
- GitHub Pages deployment validation
- README updates with local+CI instructions

Exit criteria:
- merge to `main` publishes explorer successfully

## 7. Technical Risks and Mitigations

1. Large payloads and browser memory
- Risk: loading full dataset in one JSON can increase TTI and memory.
- Mitigation: split into `index.json` + per-record JSON; lazy-fetch details.

2. Redacted solution fields mistaken for parser bugs
- Risk: empty `patch`/`output.context` interpreted as data-loss.
- Mitigation: explicit `redacted` booleans and UI messaging.

3. GitHub Pages asset/routing issues
- Risk: incorrect Vite `base` causes broken asset links.
- Mitigation: set build-time base path; avoid complex client-side routing or use hash routing.

4. Syntax highlighting performance on large files
- Risk: heavy highlight cost/freezes.
- Mitigation: lazy highlight only active tab; cap preview size with "expand" option.

5. Schema drift from upstream dataset updates
- Risk: new fields break parser assumptions.
- Mitigation: tolerant parsing + warning logs + schema validation tests in CI.

6. Submodule drift and reproducibility
- Risk: benchmark submodule changes alter expectations.
- Mitigation: pin submodule commit in main repo and document update workflow.

7. Missing scripts/deps in current skeleton
- Risk: devcontainer `postCreateCommand` references files not yet present.
- Mitigation: implement `data/scripts/requirements.txt` and parser early (Phase 0/1).

## 8. Immediate Next Build Tasks (Recommended)

1. Scaffold `frontend/` Vite React TS app and baseline layout.
2. Implement `data/scripts/process_cvdp.py` + `requirements.txt`.
3. Generate initial processed JSON into `frontend/public/data/`.
4. Implement sidebar list and record detail loading.
5. Add and validate GitHub Pages deployment workflow.
