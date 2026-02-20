# Data Pipeline Guide

## 1. Purpose

The pipeline converts raw CVDP JSONL files into a normalized frontend contract that is:

- consistent across agentic and non-agentic source shapes
- deterministic across repeated runs
- explicit about redacted solution fields

Entry point:

- `data/scripts/process_cvdp.py`

Default run:

```bash
python data/scripts/process_cvdp.py
```

## 2. Inputs and Outputs

Inputs:

- `data/raw/*.jsonl`

Supported input filename patterns:

- `*_agentic_code_generation_*`
- `*_nonagentic_code_generation_*`
- `*_nonagentic_code_comprehension*`

Outputs:

- `frontend/public/data/index.json`
- `frontend/public/data/stats.json`
- `frontend/public/data/records/<id>.json`

## 3. Normalization Contract

## 3.1 Index contract (`index.json`)

Each item includes summary metadata for list/filter operations:

- `id`, `dataset`, `mode`, `task_type`, `commercial`
- `category`, `difficulty`, `title`
- `has_system_message`, `has_reference_text`, `solutions_redacted`
- file counts for `context`, `harness`, and `target` groups

## 3.2 Record contract (`records/<id>.json`)

Each record includes:

- `meta`: normalized identity and classification
- `prompt`: `system` + `user`
- `context_files`: normalized file list with inferred language
- `harness_files`: normalized file list with inferred language
- `expected_outputs`:
  - `target_files` with `redacted` flags
  - `response_text` and `response_redacted`
- `raw.source_file`: source JSONL filename

## 3.3 Source-shape handling

Agentic source records:

- use top-level `prompt`, `system_message`, `context`, `patch`, `harness`

Non-agentic source records:

- use `input.prompt`, `input.context`, `output.context`, `output.response`, `harness.files`
- fallback to top-level `harness` map if `harness.files` is absent

## 4. Language Inference

Current mapping in `process_cvdp.py`:

- `.sv`, `.v`, `.vh` -> `systemverilog`
- `.py` -> `python`
- `.md` -> `markdown`
- `.yml`, `.yaml` -> `yaml`
- `.tcl` -> `tcl`
- `.cmd` -> `batch`
- `.txt` -> `text`
- dotfiles like `.env` -> `bash`
- unknown extensions -> `text`

## 5. Pipeline Invariants

1. Unique IDs are required across all processed files.
2. JSONL parse failures fail fast with file + line diagnostics.
3. Missing record IDs fail fast.
4. Unknown filename patterns fail fast.
5. Output ordering is deterministic:
  - source files are processed in sorted order
  - file maps are normalized in sorted path order
  - `index.json` is sorted by `id`

## 6. Redaction Handling

The pipeline preserves empty expected output fields and marks them explicitly.

- empty target file content -> `redacted: true`
- empty response text -> `response_redacted: true`
- index-level `solutions_redacted` is computed from expected output fields

This prevents UI confusion between “missing data” and “intentionally withheld solution”.

## 7. Failure Modes and Troubleshooting

Malformed JSONL:

- symptom: `ValueError` with `Malformed JSON in <file>:<line>`
- action: validate that specific line in source file

Duplicate IDs:

- symptom: `ValueError` mentioning duplicate ID and first/second locations
- action: remove/rename duplicates before processing

Unsupported dataset file naming:

- symptom: `Unsupported dataset filename`
- action: rename input files to supported pattern or extend parser rules intentionally

## 8. Test Coverage

Test file:

- `data/scripts/tests/test_process_cvdp.py`

Covered behaviors:

- language inference mapping
- source-meta parsing (including commercial/non-commercial variants)
- unknown filename rejection
- end-to-end generation of `index`, `records`, `stats`
- harness flattening and response redaction semantics
- malformed JSON failure
- missing ID failure
- duplicate ID failure

Run:

```bash
python -m pytest -q data/scripts/tests
```
