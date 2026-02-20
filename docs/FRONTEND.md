# Frontend Guide

## Stack

- React 18 + TypeScript
- Vite 5
- `react-markdown` + `remark-gfm`
- `prismjs` syntax highlighting

## Key Files

- `frontend/src/App.tsx`: explorer UI and data-loading flow.
- `frontend/src/lib/explorer.ts`: filter and language utility logic.
- `frontend/src/styles.css`: base layout and responsive styles.

## Data Loading Model

1. Fetch `./data/index.json` at startup.
2. Filter and search records in memory.
3. Fetch `./data/records/<id>.json` when a record is selected.
4. Persist current record in URL query param (`?id=...`).

## UX Sections

- Sidebar with search and filters.
- Prompt section (system and user markdown).
- File browser for context/harness/expected output files.
- Code viewer with Prism highlighting.
- Explicit redaction notice for missing reference output.

## Run Locally

```bash
cd frontend
npm install
npm run dev
```

## Build

```bash
cd frontend
npm run build
```
