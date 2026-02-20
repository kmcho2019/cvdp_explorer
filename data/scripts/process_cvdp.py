#!/usr/bin/env python3
"""Normalize CVDP JSONL files for the frontend explorer."""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any


LANGUAGE_BY_EXT = {
    ".sv": "systemverilog",
    ".v": "systemverilog",
    ".vh": "systemverilog",
    ".py": "python",
    ".md": "markdown",
    ".yml": "yaml",
    ".yaml": "yaml",
    ".tcl": "tcl",
    ".cmd": "batch",
    ".txt": "text",
}


@dataclass(frozen=True)
class SourceMeta:
    dataset: str
    mode: str
    task_type: str
    commercial: bool


def infer_language(file_path: str) -> str:
    name = Path(file_path).name
    if name.startswith(".") and name.count(".") == 1:
        return "bash"
    ext = Path(file_path).suffix.lower()
    return LANGUAGE_BY_EXT.get(ext, "text")


def parse_source_meta(jsonl_path: Path) -> SourceMeta:
    stem = jsonl_path.stem
    if "nonagentic_code_comprehension" in stem:
        mode = "nonagentic"
        task_type = "code_comprehension"
    elif "nonagentic_code_generation" in stem:
        mode = "nonagentic"
        task_type = "code_generation"
    elif "agentic_code_generation" in stem:
        mode = "agentic"
        task_type = "code_generation"
    else:
        raise ValueError(f"Unsupported dataset filename: {jsonl_path.name}")

    return SourceMeta(
        dataset=stem.replace("cvdp_v1.0.2_", ""),
        mode=mode,
        task_type=task_type,
        commercial="commercial" in stem and "no_commercial" not in stem,
    )


def normalize_file_map(file_map: dict[str, str]) -> list[dict[str, Any]]:
    entries = []
    for path, content in sorted(file_map.items()):
        text = content if isinstance(content, str) else ""
        entries.append(
            {
                "path": path,
                "language": infer_language(path),
                "content": text,
            }
        )
    return entries


def infer_title(record_id: str) -> str:
    parts = record_id.split("_")
    if len(parts) >= 4:
        return " ".join(parts[2:-1]).replace("-", " ")
    return record_id


def normalize_record(raw: dict[str, Any], source_file: str, source_meta: SourceMeta) -> tuple[dict[str, Any], dict[str, Any]]:
    categories = raw.get("categories", [])
    category = categories[0] if len(categories) > 0 else "unknown"
    difficulty = categories[1] if len(categories) > 1 else "unknown"

    is_agentic = source_meta.mode == "agentic"

    if is_agentic:
        prompt_user = raw.get("prompt", "") if isinstance(raw.get("prompt"), str) else ""
        prompt_system = raw.get("system_message", "") if isinstance(raw.get("system_message"), str) else ""
        context_map = raw.get("context", {}) if isinstance(raw.get("context"), dict) else {}
        harness_map = raw.get("harness", {}) if isinstance(raw.get("harness"), dict) else {}
        output_map = raw.get("patch", {}) if isinstance(raw.get("patch"), dict) else {}
        response_text = ""
    else:
        input_block = raw.get("input", {}) if isinstance(raw.get("input"), dict) else {}
        output_block = raw.get("output", {}) if isinstance(raw.get("output"), dict) else {}
        harness_block = raw.get("harness", {}) if isinstance(raw.get("harness"), dict) else {}

        prompt_user = input_block.get("prompt", "") if isinstance(input_block.get("prompt"), str) else ""
        prompt_system = ""
        context_map = input_block.get("context", {}) if isinstance(input_block.get("context"), dict) else {}
        output_map = output_block.get("context", {}) if isinstance(output_block.get("context"), dict) else {}
        response_text = output_block.get("response", "") if isinstance(output_block.get("response"), str) else ""

        files_block = harness_block.get("files")
        if isinstance(files_block, dict):
            harness_map = files_block
        else:
            harness_map = harness_block

    context_files = normalize_file_map(context_map)
    harness_files = normalize_file_map(harness_map)

    expected_target_files = []
    for path, content in sorted(output_map.items()):
        text = content if isinstance(content, str) else ""
        expected_target_files.append(
            {
                "path": path,
                "language": infer_language(path),
                "content": text,
                "redacted": text.strip() == "",
            }
        )

    response_redacted = response_text.strip() == ""
    solutions_redacted = all(item["redacted"] for item in expected_target_files) and response_redacted

    full = {
        "meta": {
            "id": raw.get("id", ""),
            "dataset": source_meta.dataset,
            "mode": source_meta.mode,
            "task_type": source_meta.task_type,
            "commercial": source_meta.commercial,
            "category": category,
            "difficulty": difficulty,
            "title": infer_title(str(raw.get("id", ""))),
        },
        "prompt": {
            "system": prompt_system,
            "user": prompt_user,
        },
        "context_files": context_files,
        "harness_files": harness_files,
        "expected_outputs": {
            "target_files": expected_target_files,
            "response_text": response_text,
            "response_redacted": response_redacted,
        },
        "raw": {
            "source_file": source_file,
        },
    }

    index_item = {
        "id": full["meta"]["id"],
        "dataset": source_meta.dataset,
        "mode": source_meta.mode,
        "task_type": source_meta.task_type,
        "commercial": source_meta.commercial,
        "category": category,
        "difficulty": difficulty,
        "title": full["meta"]["title"],
        "has_system_message": prompt_system.strip() != "",
        "context_file_count": len(context_files),
        "harness_file_count": len(harness_files),
        "target_file_count": len(expected_target_files),
        "has_reference_text": response_text.strip() != "",
        "solutions_redacted": solutions_redacted,
    }

    return index_item, full


def process_all(input_dir: Path, output_dir: Path) -> None:
    jsonl_files = sorted(input_dir.glob("*.jsonl"))
    if not jsonl_files:
        raise FileNotFoundError(f"No JSONL files found in {input_dir}")

    records_dir = output_dir / "records"
    records_dir.mkdir(parents=True, exist_ok=True)

    index_items: list[dict[str, Any]] = []

    for file_path in jsonl_files:
        meta = parse_source_meta(file_path)
        with file_path.open("r", encoding="utf-8") as handle:
            for line_num, line in enumerate(handle, start=1):
                text = line.strip()
                if not text:
                    continue
                try:
                    raw = json.loads(text)
                except json.JSONDecodeError as exc:
                    raise ValueError(f"Malformed JSON in {file_path}:{line_num} -> {exc}") from exc

                index_item, full_record = normalize_record(raw, file_path.name, meta)
                record_id = index_item["id"]
                if not record_id:
                    raise ValueError(f"Missing id in {file_path}:{line_num}")

                record_path = records_dir / f"{record_id}.json"
                record_path.write_text(json.dumps(full_record, ensure_ascii=True, indent=2) + "\n", encoding="utf-8")
                index_items.append(index_item)

    index_items.sort(key=lambda x: x["id"])
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "index.json").write_text(json.dumps(index_items, ensure_ascii=True, indent=2) + "\n", encoding="utf-8")

    stats = {
        "record_count": len(index_items),
        "dataset_count": len({item["dataset"] for item in index_items}),
        "modes": sorted({item["mode"] for item in index_items}),
        "task_types": sorted({item["task_type"] for item in index_items}),
    }
    (output_dir / "stats.json").write_text(json.dumps(stats, ensure_ascii=True, indent=2) + "\n", encoding="utf-8")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Process CVDP JSONL files into explorer-ready JSON.")
    parser.add_argument("--input-dir", default="../raw", help="Directory containing source JSONL files.")
    parser.add_argument("--output-dir", default="../../frontend/public/data", help="Output directory for normalized JSON files.")
    return parser


def main() -> None:
    args = build_parser().parse_args()
    script_dir = Path(__file__).resolve().parent
    input_dir = Path(args.input_dir)
    output_dir = Path(args.output_dir)
    if not input_dir.is_absolute():
        input_dir = (script_dir / input_dir).resolve()
    if not output_dir.is_absolute():
        output_dir = (script_dir / output_dir).resolve()
    process_all(input_dir, output_dir)
    print(f"Processed data written to {output_dir}")


if __name__ == "__main__":
    main()
