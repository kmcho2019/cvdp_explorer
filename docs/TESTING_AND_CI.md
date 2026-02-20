# Testing and CI

## 1. Testing Philosophy

The repo uses layered checks:

1. Data-pipeline unit tests for normalization correctness.
2. Frontend utility tests for deterministic filter/language behavior.
3. Frontend App tests for real loading/error/retry UI behavior.
4. Production build checks to catch type/bundle issues.

## 2. Local Test Matrix

Install uv (once per machine):

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

Sync Python tooling and dependencies with uv:

```bash
uv sync --group dev
```

Data pipeline tests:

```bash
uv run pytest -q data/scripts/tests
```

Python lint/type checks:

```bash
uv run ruff check data/scripts
uv run ty check data/scripts
```

Rebuild normalized artifacts (when pipeline or source data assumptions change):

```bash
uv run python data/scripts/process_cvdp.py
```

Frontend test dependencies + tests:

```bash
cd frontend
npm install
npm test
```

Frontend production build:

```bash
cd frontend
npm run build
```

## 3. Coverage Summary

Data-pipeline tests currently validate:

- filename-to-mode parsing rules
- language inference rules
- end-to-end generation of index/record/stats outputs
- redaction semantics
- malformed JSON failure behavior
- missing ID failure behavior
- duplicate ID detection behavior

Frontend tests currently validate:

- filtering utility behavior for multiple criteria
- Prism language mapping utility behavior
- debounce hook timing/cancellation behavior
- App-level success path (index + record load)
- index error + retry flow
- record error + retry flow
- empty filtered result state
- large-file performance notice rendering
- category filtering with selected-record synchronization
- sidebar virtualization behavior for large record sets
- URL-state hydration and URL-query synchronization behavior

## 4. CI Workflows

`/.github/workflows/ci.yml`:

- checks out repo (with submodules)
- installs uv/Python + Node toolchains
- runs Python lint checks (`ruff`)
- runs Python type checks (`ty`)
- runs data-pipeline tests
- runs data preprocessing
- runs frontend tests
- runs frontend production build

`/.github/workflows/deploy.yml`:

- builds normalized data
- builds frontend static assets
- deploys to GitHub Pages
- deployment setup and troubleshooting details are documented in `docs/DEPLOYMENT.md`

## 5. Pre-Merge Checklist

Before merging any non-trivial change:

1. Run Python lint/type checks.
2. Run data tests.
3. Run frontend tests.
4. Run frontend build.
5. Rebuild processed data if pipeline/schema changed.
6. Update docs for behavior/contract changes.

## 6. Troubleshooting Quick Notes

Frontend tests failing in jsdom:

- run `cd frontend && npm install` again to refresh lockfile dependencies
- ensure `@testing-library/*` and `jsdom` are present in `devDependencies`

Data tests failing with import errors:

- ensure tests are run from repo root (`uv run pytest -q data/scripts/tests`)
- verify `data/scripts/tests/conftest.py` path injection remains intact

Build succeeds locally but fails in CI:

- compare Node/Python versions with workflow configs
- ensure generated artifacts are built by scripts, not manually edited outputs
