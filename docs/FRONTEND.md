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
4. Persist current record in URL query param (`?id=...`) and handle browser back/forward (`popstate`).
5. Use cancellation (`AbortController`) for in-flight index/record requests to prevent stale UI races.

## UX Sections

- Sidebar with search and filters.
- Prompt section (system and user markdown).
- File browser for context/harness/expected output files.
- Code viewer with Prism highlighting.
- Large-file fallback: very large files are initially rendered as plain text to avoid UI stalls, with an explicit “enable highlighting” action.
- Explicit redaction notice for missing reference output.
- Explicit loading, error, retry, and empty-state UI for index and record fetches.

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
