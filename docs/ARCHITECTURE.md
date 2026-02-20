# Architecture Overview

## Goal

CVDP Explorer is a static site that makes the CVDP benchmark readable by transforming raw JSONL into a browser-friendly JSON format and rendering it in a React UI.

## High-Level Flow

1. Raw benchmark files live in `data/raw/*.jsonl`.
2. Preprocessor (`data/scripts/process_cvdp.py`) normalizes records.
3. Normalized output is written to `frontend/public/data/`.
4. Vite bundles the frontend from `frontend/`.
5. GitHub Actions deploys `frontend/dist` to GitHub Pages.

```mermaid
flowchart LR
  subgraph Source["Source Layer"]
    RAW["data/raw/*.jsonl"]
    SUB["cvdp_benchmark/ (submodule)"]
  end

  subgraph Process["Processing Layer"]
    SCRIPT["data/scripts/process_cvdp.py"]
    IDX["frontend/public/data/index.json"]
    REC["frontend/public/data/records/{id}.json"]
  end

  subgraph App["Frontend Layer"]
    VITE["Vite build (frontend/)"]
    DIST["frontend/dist/"]
    UI["React app runtime in browser"]
  end

  subgraph Deploy["Deployment Layer"]
    CI["GitHub Actions"]
    PAGES["GitHub Pages"]
  end

  RAW --> SCRIPT
  SUB --> SCRIPT
  SCRIPT --> IDX
  SCRIPT --> REC
  IDX --> VITE
  REC --> VITE
  VITE --> DIST
  DIST --> CI
  CI --> PAGES
  PAGES --> UI
```

The pipeline is intentionally one-way and static: preprocess once, then serve immutable assets.

## Repository Structure

- `data/raw/`: upstream JSONL input files.
- `data/scripts/`: preprocessing code and tests.
- `frontend/`: Vite + React TypeScript app.
- `cvdp_benchmark/`: upstream NVlabs benchmark submodule.
- `.github/workflows/`: CI/CD workflows.
- `docs/`: implementation and maintenance documentation.

```mermaid
flowchart TD
  REPO["cvdp_explorer/"] --> DATA[data/]
  REPO --> FRONTEND[frontend/]
  REPO --> BENCH[cvdp_benchmark/]
  REPO --> WF[.github/workflows/]
  REPO --> DOCS[docs/]

  DATA --> RAW[data/raw/]
  DATA --> SCRIPTS[data/scripts/]

  FRONTEND --> PUB[frontend/public/data/]
  FRONTEND --> SRC[frontend/src/]

  PUB --> INDEX[index.json]
  PUB --> RECORDS[records/*.json]
```

This layout separates data generation (`data/`) from presentation (`frontend/`) and external benchmark internals (`cvdp_benchmark/`).

## Runtime Data Access Pattern

```mermaid
sequenceDiagram
  autonumber
  participant U as User Browser
  participant APP as React App
  participant STATIC as Static Files (GitHub Pages)

  U->>APP: Open explorer URL
  APP->>STATIC: GET /data/index.json
  STATIC-->>APP: index payload
  APP->>APP: render sidebar and select ID
  APP->>STATIC: GET /data/records/{id}.json
  STATIC-->>APP: record payload
  APP->>U: render prompt, files, metadata
  U->>APP: change search/filter/select
  APP->>APP: client-side filter + render update
```

This keeps navigation fast: only one index request and per-record lazy fetches.

## CI/CD Build and Deploy Sequence

```mermaid
sequenceDiagram
  autonumber
  participant GIT as Git Push/PR
  participant CI as GitHub Actions CI
  participant DP as Data Pipeline
  participant FE as Frontend Build
  participant DEP as Deploy Workflow
  participant PAGES as GitHub Pages

  GIT->>CI: trigger ci.yml
  CI->>DP: run pipeline tests + preprocess data
  CI->>FE: run frontend tests + vite build
  CI-->>GIT: pass/fail status

  GIT->>DEP: trigger deploy.yml (main branch)
  DEP->>DP: regenerate normalized artifacts
  DEP->>FE: build static frontend bundle
  DEP->>PAGES: publish frontend/dist
```

CI validates correctness, while deploy rebuilds artifacts to ensure published output is reproducible from source.

## Design Principles

- Keep preprocessing deterministic and testable.
- Keep browser payload light with an index + lazy-loaded record files.
- Keep behavior explicit when expected outputs are redacted.
- Keep deployment static and reproducible.

For deployment operations and troubleshooting, see `docs/DEPLOYMENT.md`.
