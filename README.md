# CVDP Benchmark Explorer

Static explorer for the NVIDIA CVDP benchmark dataset.

This repository converts raw benchmark JSONL files into a frontend-friendly format and serves an interactive React UI for browsing prompts, context files, harness files, and redacted reference outputs.

## Quick Links

For first-time readers:

- [`GUIDELINES.md`](GUIDELINES.md): contributor map (where to edit, validate, and document changes).
- [`README.md`](README.md): top-level setup, run, testing, and deployment quick guide.
- [`docs/README.md`](docs/README.md): documentation index for architecture, pipeline, frontend, CI, and deployment details.
- Live GitHub Pages site: <https://kmcho2019.github.io/cvdp_explorer/>
- CVDP dataset (Hugging Face): <https://huggingface.co/datasets/nvidia/cvdp-benchmark-dataset>

## Pinned CVDP Baseline

- Dataset version: `1.0.2`
- Dataset source: <https://huggingface.co/datasets/nvidia/cvdp-benchmark-dataset>
- Evaluator submodule path: `cvdp_benchmark`
- Evaluator submodule commit: `6b1147d158985c123b74596d670c0862df9e58e9`

When the upstream benchmark dataset or evaluator changes, update this section and related docs/tests in the same PR to keep references traceable.

## Quick Start

## 1. Ensure submodules are initialized

```bash
git submodule update --init --recursive
```

## 2. Install uv and sync Python tooling

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
uv sync --group dev
```

## 3. Build normalized dataset artifacts

```bash
uv run python data/scripts/process_cvdp.py
```

This generates:

- `frontend/public/data/index.json`
- `frontend/public/data/stats.json`
- `frontend/public/data/records/*.json`

## 4. Run frontend locally

```bash
cd frontend
npm install
npm run dev
```

## Testing

Python pipeline tests:

```bash
uv run pytest -q data/scripts/tests
```

Python lint/type checks:

```bash
uv run ruff check data/scripts
uv run ty check data/scripts
```

Frontend tests:

```bash
cd frontend
npm test
```

Frontend build verification:

```bash
cd frontend
npm run build
```

## Documentation

Project docs are consolidated under `docs/`.

- `docs/README.md`: documentation index.
- `docs/SPECIFICATION_AND_DEVELOPMENT_PLAN.md`: implementation blueprint.
- `docs/ARCHITECTURE.md`: system design and repository layout.
- `docs/CVDP_BENCHMARK_INTERNALS.md`: deep dive into `cvdp_benchmark` data model and processing pipeline internals.
- `docs/DATA_PIPELINE.md`: normalization and output contract.
- `docs/FRONTEND.md`: UI behavior and rendering model.
- `docs/TESTING_AND_CI.md`: testing commands and CI flow.
- `docs/DEPLOYMENT.md`: GitHub Pages setup, deployment flow, and local deployment options.

## CI/CD

- `/.github/workflows/ci.yml`: PR and main-branch validation (tests + build).
- `/.github/workflows/deploy.yml`: GitHub Pages deployment.

## Deployment Quick Guide

### 1. GitHub Pages deployment

1. Ensure `Settings -> Pages -> Source` is set to `GitHub Actions`.
2. Push to `main` (or run deploy workflow manually).
3. Watch `Deploy CVDP Explorer` in GitHub Actions.
4. Open the published site: <https://kmcho2019.github.io/cvdp_explorer/>.

Detailed steps and troubleshooting are in `docs/DEPLOYMENT.md`.

### 1.1 Search indexing / Search Console

- Google ownership verification file must live in `frontend/public/` so it is deployed with the site.
- Current verification file:
  - `frontend/public/googlea2df242e632476d2.html`
- SEO baseline files:
  - `frontend/public/robots.txt`
  - `frontend/public/sitemap.xml`
- Full verification + indexing checklist:
  - `docs/DEPLOYMENT.md` (sections on Search Console and SEO baseline)

### 2. Local deployment options

Development server:

```bash
cd frontend
npm install
npm run dev
```

Production preview:

```bash
cd frontend
npm run build
npm run preview -- --host --port 4173
```

Static hosting simulation:

```bash
cd frontend
npm run build
cd dist
python -m http.server 4173
```

Pages base-path simulation:

```bash
cd frontend
GITHUB_REPOSITORY=owner/repo npm run build
npm run preview -- --host --port 4173
```

## Notes on Redacted Outputs

Public CVDP datasets in this repo include many tasks where expected solution files are intentionally empty. The pipeline preserves these fields and labels them as redacted so the UI can communicate this explicitly.
