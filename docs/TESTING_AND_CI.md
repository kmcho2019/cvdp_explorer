# Testing and CI

## Local Test Commands

Python data pipeline tests:

```bash
python -m pip install -r data/scripts/requirements.txt
python -m pytest -q data/scripts/tests
```

Frontend unit tests:

```bash
cd frontend
npm install
npm test
```

Frontend production build check:

```bash
cd frontend
npm run build
```

## What Is Covered

- Data pipeline:
  - schema normalization
  - dataset metadata parsing
  - redaction handling
  - deterministic index/record generation
- Frontend:
  - record filtering logic
  - Prism language mapping logic

## GitHub Actions

- `deploy.yml`:
  - processes data
  - builds frontend
  - deploys to GitHub Pages
- `ci.yml`:
  - runs data pipeline tests
  - runs frontend tests
  - runs frontend build

CI should pass before merging to `main`.
