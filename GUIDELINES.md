# Repository Guidelines

This file is the high-level operating guide for this repository.

Use it to answer:

- What are we building?
- Where should changes go?
- Which docs explain each area?
- What is the minimum quality bar for docs, tests, and commits?

For deep implementation details, use the linked documents in `docs/`.

## 1. Overall Implementation Goals

1. Build a static, readable, searchable CVDP benchmark explorer.
2. Keep the data pipeline deterministic and transparent.
3. Preserve source intent (including redacted outputs) without data distortion.
4. Keep deployment simple and reproducible on GitHub Pages.
5. Make contribution flow understandable via documentation, tests, and clear commit history.

## 2. Quick Repository Map

- `data/raw/`
  - Source benchmark JSONL files.
- `data/scripts/`
  - Data preprocessing logic and tests.
- `frontend/`
  - Vite + React static UI that reads preprocessed data from `public/data`.
- `docs/`
  - Main documentation hub (architecture, pipeline, frontend, testing/CI, internals).
- `.github/workflows/`
  - CI validation and Pages deployment workflows.
- `cvdp_benchmark/`
  - Upstream benchmark harness submodule for reference/internals.
- `reference/`
  - Paper and external reference material.

## 3. Documentation Map (Where To Read More)

Start here:

- `docs/README.md`
  - Documentation index.

Primary docs:

- `docs/SPECIFICATION_AND_DEVELOPMENT_PLAN.md`
  - Implementation blueprint and phased roadmap.
- `docs/ARCHITECTURE.md`
  - System-level architecture and component boundaries.
- `docs/DATA_PIPELINE.md`
  - Raw-to-normalized data transformation contract.
- `docs/FRONTEND.md`
  - Frontend structure, data-loading model, and rendering behavior.
- `docs/TESTING_AND_CI.md`
  - Local test commands and CI expectations.
- `docs/CVDP_BENCHMARK_INTERNALS.md`
  - Detailed internals of the `cvdp_benchmark` submodule.

Rule of thumb:

- Add detail to the specific doc for the area you changed.
- Keep this file (`GUIDELINES.md`) as the top-level navigator and standards reference.

## 4. Documentation Guidelines

1. Prefer updating existing docs over creating duplicates.
2. When behavior changes, update the relevant area doc in the same change.
3. Keep docs practical: describe contracts, assumptions, and commands.
4. Use repo-relative paths in docs (example: `data/scripts/process_cvdp.py`).
5. Keep `docs/README.md` current when adding/removing docs.

## 5. Testing Guidelines

Minimum local checks before merge:

1. Sync Python tooling:

```bash
uv sync --group dev
```

2. Python lint/type checks:

```bash
uv run ruff check data/scripts
uv run ty check data/scripts
```

3. Data pipeline tests:

```bash
uv run pytest -q data/scripts/tests
```

4. Regenerate data artifacts (when pipeline/schema changes):

```bash
uv run python data/scripts/process_cvdp.py
```

5. Frontend tests:

```bash
cd frontend
npm test
```

6. Frontend production build:

```bash
cd frontend
npm run build
```

Expected quality bar:

- New behavior should include tests where practical.
- Bug fixes should include regression coverage when feasible.
- If tests are intentionally skipped, state why in the PR/commit body.

Python tooling standard:

- Use `uv` for Python environment and dependency management in this repo.
- Add/update Python dependencies in `pyproject.toml` and run `uv lock` as needed.
- Prefer `uv run ...` for Python commands in docs, CI, and local instructions.

## 6. Git Commit Guidelines

Required:

- Use signed-off commits: `git commit -s`

Recommended format:

```text
<type>(<scope>): <short imperative summary>

Why:
- motivation and context (the why)
What:
- key implementation changes (the what)
Validation:
- tests/build/commands run (validation)
```

Commit conventions:

1. Keep one logical change per commit.
2. Use clear scopes (examples: `data`, `frontend`, `docs`, `ci`).
3. Prefer multi-line commit bodies for non-trivial changes.
4. Mention concrete validation commands in the body.
5. Keep history reviewable: avoid mixing unrelated refactors and features.
6. Use signoff for each git commit if possible.
7. Before pushing, verify the final commit message formatting:
   - run `git log -1 --pretty=%B`
   - ensure no literal escape artifacts like `\n`, `\t`, or `\r` appear in the message body
   - if malformed text is found, fix it before pushing (for latest commit, use `git commit --amend`)

Common commit types:

- `feat`: new feature
- `fix`: bug fix
- `docs`: documentation
- `test`: tests
- `refactor`: internal code restructuring
- `chore`: tooling/config maintenance
- `ci`: workflow/pipeline updates

## 7. Basic Change Workflow

1. Identify area and read the corresponding `docs/*` file.
2. Implement the smallest complete change.
3. Update docs for changed behavior.
4. Run relevant tests/build locally.
5. Commit in logical chunks with `-s` and detailed bodies.

## 8. Definition of Done (Initial Standard)

A change is complete when:

1. Implementation works for intended scope.
2. Tests/build pass for impacted areas.
3. Documentation and navigation links are updated.
4. Commits are logically grouped and signed off.
