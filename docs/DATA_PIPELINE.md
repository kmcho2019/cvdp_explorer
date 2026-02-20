# Data Pipeline Guide

## Script

- Entry point: `data/scripts/process_cvdp.py`
- Default command:

```bash
python data/scripts/process_cvdp.py
```

## Inputs

- Source directory: `data/raw/`
- Supported dataset filename patterns:
  - `*_agentic_code_generation_*`
  - `*_nonagentic_code_generation_*`
  - `*_nonagentic_code_comprehension*`

## Outputs

- `frontend/public/data/index.json`
- `frontend/public/data/stats.json`
- `frontend/public/data/records/<id>.json`

## Normalization Behavior

- Agentic records map top-level `prompt/system_message/context/harness/patch` fields into a unified schema.
- Non-agentic records map `input`/`output`/`harness.files` into the same unified schema.
- Language labels are inferred from file extension for syntax highlighting.
- Empty expected output fields are preserved and flagged as `redacted`.

## Error Handling

- Invalid JSON raises an error with source file and line number.
- Missing record IDs fail processing.
- Unsupported dataset filename patterns fail processing early.

## Test Coverage

`data/scripts/tests/test_process_cvdp.py` covers:

- language inference mapping
- dataset metadata parsing
- end-to-end output generation (index/record/stats)
- redaction flag behavior

Run:

```bash
python -m pytest -q data/scripts/tests
```
