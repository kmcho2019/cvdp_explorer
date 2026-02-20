# Frontend Guide

## 1. Purpose

The frontend is a static React application for browsing normalized CVDP records with:

- searchable/filterable record navigation
- category/dataset/mode/difficulty filtering
- markdown prompt rendering
- syntax-highlighted code/document viewing
- explicit redaction and loading/error states

## 2. Stack

- React 18 + TypeScript
- Vite 5
- `react-markdown` + `remark-gfm`
- `prismjs` for syntax highlighting
- Vitest + Testing Library for UI and utility tests

## 3. Key Files

- `frontend/src/App.tsx`
  - primary explorer UI, loading flow, URL sync, and render logic
- `frontend/src/lib/explorer.ts`
  - filter and Prism-language helper utilities
- `frontend/src/styles.css`
  - layout, visual design, and state styling
- `frontend/src/App.test.tsx`
  - App-level UI behavior tests
- `frontend/src/lib/explorer.test.ts`
  - utility-level tests

## 4. Data Loading and State Model

## 4.1 Startup

1. Fetch `./data/index.json`.
2. Resolve initial selected record ID from URL (`?id=`) or first record.
3. Load `./data/records/<id>.json`.

## 4.2 Navigation state

- selected ID is reflected in URL query params
- filter/search state is reflected in URL query params:
  - `q`, `mode`, `difficulty`, `dataset`, `category`
- browser back/forward is supported with `popstate` handling
- if filters remove the currently selected ID, selection automatically moves to the first visible result

## 4.3 Async safety

- index and record fetches use `AbortController`
- stale in-flight requests are cancelled on state changes

## 4.4 UI states

Implemented explicit states for both index and record fetches:

- loading
- error
- retry
- empty data
- empty filtered results

## 5. Rendering Model

Prompt rendering:

- system/user prompt blocks use markdown rendering (`react-markdown` + GFM)

File rendering:

- context, harness, and expected-output files shown in grouped navigation
- selected file shown in code viewer with Prism highlighting
- expected output redaction clearly labeled

## 6. Syntax Highlighting and Performance Guardrail

Prism language mapping is handled by `mapPrismLanguage`:

- `systemverilog` -> `verilog`
- `batch` -> `bash`
- `text` -> `none`

Performance guardrail:

- large files above threshold are rendered as plain escaped text first
- user can opt into syntax highlighting via explicit action

This keeps the viewer responsive on very large files while still allowing deeper inspection.

## 7. Accessibility and UX Notes

- filter controls have explicit labels and ARIA names
- record count uses `aria-live` for state updates
- error states are rendered as visible alert sections with retry controls
- empty sections show clear, non-ambiguous messages
- search input is debounced to reduce unnecessary list churn while typing
- sidebar record list is virtualized for large datasets to maintain responsiveness

## 8. Testing Coverage

`frontend/src/lib/explorer.test.ts` covers:

- Prism language alias mapping
- filter behavior by mode, difficulty, dataset, category, and combined criteria

`frontend/src/lib/useDebouncedValue.test.ts` covers:

- debounce timing behavior
- cancellation semantics for rapid sequential updates

`frontend/src/App.test.tsx` covers:

- successful index + record loading
- index error and retry behavior
- record error and retry behavior
- filter empty-state rendering
- large-file performance notice rendering
- category filter + selected record synchronization behavior
- virtualization behavior for long record lists
- URL-query hydration for selected ID + filters
- URL-query updates for debounced search and filters

Run:

```bash
cd frontend
npm test
```

## 9. Local Development Commands

Start dev server:

```bash
cd frontend
npm install
npm run dev
```

Build for production:

```bash
cd frontend
npm run build
```
