# Frontend Guide

## 1. Purpose

The frontend is a static React application for browsing normalized CVDP records with:

- searchable/filterable record navigation
- category/dataset/task-type/mode/difficulty filtering
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
- `frontend/src/lib/badges.ts`
  - semantic badge tone and class mapping for metadata tags
- `frontend/src/lib/categories.ts`
  - category-ID label/description mapping for more interpretable category UI text
- `frontend/src/lib/hierarchy.ts`
  - tree hierarchy builder for task-type/category/mode/difficulty navigation
- `frontend/src/lib/benchmarkGuide.ts`
  - in-app benchmark overview/evaluation-flow/category-reference content model
- `frontend/src/styles.css`
  - layout, visual design, and state styling
- `frontend/src/App.test.tsx`
  - App-level UI behavior tests
- `frontend/src/lib/explorer.test.ts`
  - utility-level tests
- `frontend/src/lib/badges.test.ts`
  - badge semantics regression coverage
- `frontend/src/lib/promptMarkdown.test.ts`
  - markdown code-language inference and inline/block classification coverage
- `frontend/src/lib/categories.test.ts`
  - category-description mapping regression coverage
- `frontend/src/lib/hierarchy.test.ts`
  - hierarchy aggregation and ordering regression coverage
- `frontend/src/lib/benchmarkGuide.test.ts`
  - benchmark-guide dataset integrity and label mapping coverage

## 4. Data Loading and State Model

## 4.1 Startup

1. Fetch `./data/index.json`.
2. Resolve initial selected record ID from URL (`?id=`) or first record.
3. Load `./data/records/<id>.json`.

## 4.2 Navigation state

- selected ID is reflected in URL query params
- filter/search state is reflected in URL query params:
  - `q`, `task`, `mode`, `difficulty`, `dataset`, `category`
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
- fenced prompt code blocks are rendered with Prism highlighting in markdown cards
- when markdown uses generic `text` fences, the renderer infers a likely language from snippet content (for example: RTL keywords -> Verilog, assignment-list snippets -> Python-like highlighting)
- inline markdown code spans use a dedicated high-contrast style for readability

File rendering:

- context, harness, and expected-output files shown in grouped navigation
- selected file shown in code viewer with Prism highlighting when file content is source code/text
- markdown files (for example `docs/specification.md`) are rendered as formatted markdown in the file viewer, including GFM tables and highlighted fenced code blocks
- expected output redaction clearly labeled

Metadata badge rendering:

- badges use semantic color families instead of one neutral style
- difficulty follows traffic-light coloring (`easy` green, `medium` amber, `hard` red)
- mode, category, dataset, commercial-status, record IDs, and source-file labels each have distinct badge tones for faster visual scanning
- category IDs use short explanatory labels in filter options and record metadata (for example `cid002 (Code generation, threshold scoring)`)

Alternative hierarchy navigation:

- sidebar tree navigator organizes records as `task type -> category -> mode -> difficulty`
- tree node clicks apply the same underlying filters as dropdown controls
- hierarchy nodes are color-coded via the same semantic badge system used in record metadata

Benchmark guide section:

- the main panel includes a dedicated `Benchmark Guide` section alongside the record explorer
- the guide summarizes benchmark goals, explains evaluation flow from submodule internals, and provides per-category behavior/scoring references
- all guide entries include source-path pointers back to `cvdp_benchmark` and paper/reference materials for traceability

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

`frontend/src/lib/badges.test.ts` covers:

- semantic badge-tone mapping by metadata type
- difficulty traffic-light mapping guarantees
- fallback behavior for unexpected values

`frontend/src/lib/promptMarkdown.test.ts` covers:

- language-class passthrough for explicit fenced code languages
- inference behavior for generic `text` fenced snippets
- inline-vs-block markdown code classification logic

`frontend/src/lib/categories.test.ts` covers:

- category ID to short-description mapping
- scoring/mode grouping labels used in UI category text
- fallback handling for unknown category formats

`frontend/src/lib/hierarchy.test.ts` covers:

- hierarchy node aggregation counts across task type/category/mode/difficulty
- deterministic ordering for semantic navigation levels

`frontend/src/lib/benchmarkGuide.test.ts` covers:

- expected category coverage for the initial CVDP release
- scoring/availability label behavior used by the guide table
- evaluation-flow step structure integrity

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
- hierarchy navigation interactions across task type/category/mode/difficulty
- benchmark-guide section rendering and section-switch behavior
- virtualization behavior for long record lists
- URL-query hydration for selected ID + filters (including task type)
- URL-query updates for debounced search and filters (including task type)
- semantic badge classes for key metadata tags
- prompt markdown code-fence rendering with inferred syntax-language classes
- markdown context-file rendering in file viewer (heading/list/code-fence behavior)
- category label rendering with short descriptions in filter/metadata views

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
