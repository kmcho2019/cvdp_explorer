from __future__ import annotations

import json
from pathlib import Path

from process_cvdp import infer_language, parse_source_meta, process_all


def _write_jsonl(path: Path, rows: list[dict]) -> None:
    path.write_text("\n".join(json.dumps(row) for row in rows) + "\n", encoding="utf-8")


def test_infer_language_maps_known_extensions() -> None:
    assert infer_language("rtl/core.sv") == "systemverilog"
    assert infer_language("src/test_runner.py") == "python"
    assert infer_language("docs/specification.md") == "markdown"
    assert infer_language("src/.env") == "bash"
    assert infer_language("src/unknown.xyz") == "text"


def test_parse_source_meta_detects_dataset_properties() -> None:
    meta = parse_source_meta(Path("cvdp_v1.0.2_nonagentic_code_generation_no_commercial.jsonl"))
    assert meta.dataset == "nonagentic_code_generation_no_commercial"
    assert meta.mode == "nonagentic"
    assert meta.task_type == "code_generation"
    assert meta.commercial is False


def test_process_all_generates_index_records_and_stats(tmp_path: Path) -> None:
    input_dir = tmp_path / "raw"
    output_dir = tmp_path / "out"
    input_dir.mkdir()

    agentic_record = {
        "id": "cvdp_agentic_demo_case_0001",
        "categories": ["cid001", "medium"],
        "system_message": "system text",
        "prompt": "Build rtl module",
        "context": {
            "rtl/demo.sv": "module demo; endmodule",
            "docs/specification.md": "# Spec",
        },
        "patch": {
            "rtl/demo.sv": ""
        },
        "harness": {
            "src/test_runner.py": "print('run')"
        },
    }

    nonagentic_record = {
        "id": "cvdp_copilot_demo_case_0002",
        "categories": ["cid009", "easy"],
        "input": {
            "prompt": "Explain the section",
            "context": {
                "verif/tb_demo.sv": "task check; endtask"
            },
        },
        "output": {
            "response": "The golden model is in task check.",
            "context": {},
        },
        "harness": {},
    }

    _write_jsonl(
        input_dir / "cvdp_v1.0.2_agentic_code_generation_no_commercial.jsonl",
        [agentic_record],
    )
    _write_jsonl(
        input_dir / "cvdp_v1.0.2_nonagentic_code_comprehension.jsonl",
        [nonagentic_record],
    )

    process_all(input_dir, output_dir)

    index = json.loads((output_dir / "index.json").read_text(encoding="utf-8"))
    assert len(index) == 2

    by_id = {item["id"]: item for item in index}
    assert by_id["cvdp_agentic_demo_case_0001"]["mode"] == "agentic"
    assert by_id["cvdp_agentic_demo_case_0001"]["solutions_redacted"] is True
    assert by_id["cvdp_copilot_demo_case_0002"]["task_type"] == "code_comprehension"
    assert by_id["cvdp_copilot_demo_case_0002"]["has_reference_text"] is True

    record_one = json.loads((output_dir / "records" / "cvdp_agentic_demo_case_0001.json").read_text(encoding="utf-8"))
    assert record_one["prompt"]["system"] == "system text"
    assert record_one["expected_outputs"]["target_files"][0]["redacted"] is True
    assert record_one["context_files"][0]["language"] in {"markdown", "systemverilog"}

    record_two = json.loads((output_dir / "records" / "cvdp_copilot_demo_case_0002.json").read_text(encoding="utf-8"))
    assert record_two["expected_outputs"]["response_redacted"] is False
    assert record_two["expected_outputs"]["response_text"].startswith("The golden model")

    stats = json.loads((output_dir / "stats.json").read_text(encoding="utf-8"))
    assert stats["record_count"] == 2
    assert sorted(stats["modes"]) == ["agentic", "nonagentic"]
