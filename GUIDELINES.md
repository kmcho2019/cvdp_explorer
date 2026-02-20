# Repository Guidelines

This file is the top-level contributor map for the repository.

Use it to answer:

- What the project does.
- Where to make specific types of changes.
- Which docs and files are the source of truth for each area.
- What checks and commit standards are required before merge.

For detailed implementation contracts, use the linked docs in `docs/`.

## 1. Project Purpose

This repository builds and deploys a static CVDP Benchmark Explorer:

1. Normalize raw benchmark JSONL data into frontend-consumable JSON.
2. Render the normalized data in a React/Vite static web app.
3. Deploy the app to GitHub Pages with reproducible CI/CD.

## 2. First 30 Minutes (New Contributor Path)

1. Read `README.md` for quick start and local run commands.
2. Read `docs/README.md` for documentation navigation.
3. Sync tooling and run baseline checks:

```bash
uv sync --group dev
uv run ruff check data/scripts
uv run ty check data/scripts
uv run pytest -q data/scripts/tests
cd frontend && npm ci && npm test && npm run build
```

4. Pick the area you are changing and open the matching docs from Section 4 below.

## 3. Repository Map (What Lives Where)

- `data/raw/`:
  - Source benchmark JSONL input files.
- `data/scripts/`:
  - Python normalization pipeline and tests.
- `frontend/src/`:
  - React UI code.
- `frontend/public/data/`:
  - Generated artifacts consumed by the frontend.
  - Treat as generated output from the pipeline, not hand-authored source.
- `docs/`:
  - Area-specific implementation documentation.
- `.github/workflows/`:
  - CI validation and GitHub Pages deployment workflows.
- `cvdp_benchmark/`:
  - Upstream benchmark harness submodule for internals/reference.
- `reference/`:
  - External/paper reference material.

## 4. Documentation Map (Read This For...)

- Repo orientation and docs index:
  - `docs/README.md`
- End-to-end architecture and boundaries:
  - `docs/ARCHITECTURE.md`
- Data normalization schema/mapping/invariants:
  - `docs/DATA_PIPELINE.md`
- Frontend state, rendering, and UX behavior:
  - `docs/FRONTEND.md`
- Test matrix and CI behavior:
  - `docs/TESTING_AND_CI.md`
- GitHub Pages deployment and local hosting options:
  - `docs/DEPLOYMENT.md`
- Upstream benchmark internals and execution model:
  - `docs/CVDP_BENCHMARK_INTERNALS.md`
- Project blueprint/roadmap context:
  - `docs/SPECIFICATION_AND_DEVELOPMENT_PLAN.md`

## 5. Task-to-File Map (Edit Here)

Data pipeline changes:

- Primary code: `data/scripts/process_cvdp.py`
- Tests: `data/scripts/tests/test_process_cvdp.py`
- Contracts/docs: `docs/DATA_PIPELINE.md`, `docs/TESTING_AND_CI.md`

Frontend behavior/UI changes:

- Primary code: `frontend/src/App.tsx`, `frontend/src/lib/*`, `frontend/src/styles.css`
- Tests: `frontend/src/App.test.tsx`, `frontend/src/lib/*.test.ts`
- Contracts/docs: `docs/FRONTEND.md`, `docs/ARCHITECTURE.md`

Deployment/CI changes:

- Workflows: `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`
- Build/runtime config: `frontend/vite.config.ts`, `.devcontainer/*`
- Docs: `docs/DEPLOYMENT.md`, `docs/TESTING_AND_CI.md`, `README.md`

Benchmark-internals documentation changes:

- Docs: `docs/CVDP_BENCHMARK_INTERNALS.md`
- Reference source: `cvdp_benchmark/` submodule code

## 6. Documentation Standards

1. Prefer updating existing docs over creating duplicates.
2. When behavior changes, update the matching area doc in the same PR/commit series.
3. Keep docs practical: assumptions, contracts, commands, and failure modes.
4. Use repo-relative paths in docs (example: `data/scripts/process_cvdp.py`).
5. Keep `docs/README.md` current when adding/removing major docs.

## 7. Validation Standards

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

4. Rebuild generated data when pipeline/schema behavior changes:

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

Quality bar:

- New behavior should include tests where practical.
- Bug fixes should include regression coverage when feasible.
- If checks are intentionally skipped, explain why in PR/commit body.

Python tooling policy:

- Use `uv` for Python env/dependency management in this repo.
- Add/update Python dependencies in `pyproject.toml`; refresh lock with `uv lock`.
- Prefer `uv run ...` commands in docs, CI, and local instructions.

## 8. Git Commit Guidelines

Required:

- Use signed-off commits: `git commit -s`

Recommended message format:

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
2. Use clear scopes (examples: `data`, `frontend`, `docs`, `ci`, `deploy`).
3. Prefer multi-line bodies for non-trivial commits.
4. Keep body spacing compact:
   - no empty line between section heading and first bullet (`Why:`, `What:`, `Validation:`)
   - no empty line between bullets in the same section
   - exactly one blank line between subject and body
5. Mention concrete validation commands in the body.
6. Avoid mixing unrelated refactors/features/docs in one commit.
7. Before pushing, verify final message formatting:
   - run `git log -1 --pretty=%B`
   - ensure section spacing is compact
   - ensure no literal escape artifacts like `\n`, `\t`, `\r`
   - if malformed, fix before push (`git commit --amend` for latest commit)

Common commit types:

- `feat`: new feature
- `fix`: bug fix
- `docs`: documentation
- `test`: tests
- `refactor`: internal restructuring
- `chore`: tooling/config maintenance
- `ci`: workflow/pipeline changes

## 9. Basic Change Workflow

1. Identify the area being changed.
2. Read the matching docs from Section 4.
3. Implement the smallest complete change.
4. Update docs impacted by behavior/contract changes.
5. Run relevant validations from Section 7.
6. Commit in logical chunks with `-s` and detailed bodies.

## 10. Definition of Done

A change is complete when:

1. Implementation works for intended scope.
2. Relevant tests/build checks pass.
3. Documentation is updated and still navigable.
4. Commits are logically grouped, signed off, and clearly formatted.
