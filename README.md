

# CVDP Benchmark Explorer



A lightweight, static web application and data pipeline designed to visually explore the [NVIDIA Chip Verification and Design Prompts (CVDP)](https://huggingface.co/datasets/nvidia/cvdp-benchmark-dataset) dataset. ## Motivation

Evaluating Large Language Models for Electronic Design Automation (EDA) and RTL generation involves dense, multi-turn prompts, complex context windows, and intricate Verilog/SystemVerilog test harnesses. The upstream CVDP dataset distributes this data as raw JSONL files. While efficient for programmatic evaluation, reading nested hardware descriptions and conversational prompts directly from JSONL makes qualitative analysis and debugging tedious. 



This repository provides a processed data pipeline and a React-based frontend to render these benchmarks into a readable, easily navigable web interface with full syntax highlighting.

## Repository Architecture



The project is divided into three main components: a Python data processing pipeline, a React/Vite frontend, and a containerized development environment.```text

cvdp-explorer/

├── .devcontainer/        # Docker and VS Code configuration for a reproducible dev environment

├── .github/workflows/    # CI/CD pipelines for automated GitHub Pages deployment

├── cvdp_benchmark/       # Git submodule tracking the official NVlabs evaluation harness

├── data/                 

│   ├── raw/              # Destination for downloaded Hugging Face .jsonl files

│   └── scripts/          # Python 3.12 scripts to parse and format the dataset

├── frontend/             # Vite/React web application

│   └── public/           # Destination for the processed JSON output

└── reference/            # Academic context, including the original CVDP paper

Prerequisites

The easiest way to work on this project is using VS Code Devcontainers. The provided .devcontainer configuration automatically provisions a Linux environment equipped with:

Python 3.12 (with formatting tools like Black)

Node.js v20 (with Vite, ESLint, Prettier)

Essential CLI tools: git, vim, tmux, htop, jq

VS Code extensions for Python, React, and Verilog HDL syntax highlighting.

Quickstart

Clone the repository (including the submodule):

Bash



git clone --recursive [https://github.com/kmcho2019/cvdp-explorer.git](https://github.com/kmcho2019/cvdp-explorer.git)cd cvdp-explorer

(If you already cloned it without the submodule, run git submodule update --init --recursive)

Launch the Devcontainer:

Open the project folder in VS Code.

Press Ctrl+Shift+P (or Cmd+Shift+P on macOS) and select Dev Containers: Reopen in Container.

The automated setup script will install both Python and Node.js dependencies upon creation.

Fetch the Dataset:

Download the cvdp_v1.0.2_agentic_code_generation.jsonl and cvdp_v1.0.2_nonagentic_code_generation.jsonl files from Hugging Face and place them in the data/raw/ directory.

Process the Data:

Convert the raw JSONL into frontend-friendly JSON.

Bash



cd data/scripts

python process_cvdp.py

Run the Web Explorer Locally:

Start the Vite development server to view the UI.

Bash



cd ../../frontend

npm run dev

Navigate to http://localhost:5173 in your browser.

Deployment

This project is configured to deploy automatically to GitHub Pages via GitHub Actions. Any push to the main branch will trigger the .github/workflows/deploy.yml pipeline, which builds the Vite project and deploys the dist/ directory.

Acknowledgements

Dataset and Benchmark: NVlabs/cvdp_benchmark

Paper: Comprehensive Verilog Design Problems: A Next-Generation Benchmark Dataset for Evaluating Large Language Models and Agents on RTL Design and Verification


