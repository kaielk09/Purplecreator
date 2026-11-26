"""Validate and prepare reviewed external JSONL datasets for Purple Creator."""
from __future__ import annotations

import argparse
import hashlib
import json
import random
from pathlib import Path


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read_jsonl(path: Path) -> list[dict]:
    rows = []
    with path.open("r", encoding="utf-8") as stream:
        for number, line in enumerate(stream, 1):
            if not line.strip():
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError as exc:
                raise ValueError(f"{path}:{number}: invalid JSON: {exc}") from exc
            if not isinstance(row, dict):
                raise ValueError(f"{path}:{number}: expected a JSON object")
            rows.append(row)
    return rows


def validate_source(source: dict) -> None:
    required = {
        "id", "publisher", "revision", "url", "license", "license_url",
        "commercial_use_allowed", "modification_allowed", "record_format", "status"
    }
    missing = sorted(required - source.keys())
    if missing:
        raise ValueError(f"Dataset entry missing fields: {missing}")
    if source["status"] != "approved":
        raise ValueError(f"{source['id']} is not approved; keep it quarantined.")
    if source["license"] in {"", "UNKNOWN", "NOASSERTION", None}:
        raise ValueError(f"{source['id']} has no verified license.")
    if not source["url"] or not source["license_url"]:
        raise ValueError(f"{source['id']} needs source and license URLs.")
    if source["commercial_use_allowed"] is not True:
        raise ValueError(f"{source['id']} is not approved for commercial use.")
    if source["modification_allowed"] is not True:
        raise ValueError(f"{source['id']} does not permit modification.")
    if source["record_format"] != "jsonl":
        raise ValueError(f"Unsupported record format: {source['record_format']}")


def normalize(row: dict, source_id: str) -> dict[str, str]:
    prompt = row.get("instruction") or row.get("prompt") or row.get("question")
    answer = row.get("output") or row.get("response") or row.get("answer")
    if not isinstance(prompt, str) or not prompt.strip():
        raise ValueError(f"{source_id}: record has no prompt/instruction/question")
    if not isinstance(answer, str) or not answer.strip():
        raise ValueError(f"{source_id}: record has no answer/output/response")
    return {
        "source_id": source_id,
        "instruction": prompt.strip(),
        "answer": answer.strip(),
        "category": str(row.get("category") or "general").strip().lower(),
        "language": str(row.get("language") or "unknown").strip().lower(),
    }


def fingerprint(row: dict[str, str]) -> str:
    raw = json.dumps(
        [row["instruction"], row["answer"]],
        ensure_ascii=False,
        separators=(",", ":"),
    )
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--input-dir", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--seed", type=int, default=321)
    parser.add_argument("--validation", type=float, default=0.05)
    parser.add_argument("--test", type=float, default=0.05)
    args = parser.parse_args()

    if args.validation < 0 or args.test < 0 or args.validation + args.test >= 1:
        parser.error("validation + test must be >= 0 and < 1")

    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    sources = manifest.get("dataset_mixture", [])
    if not sources:
        raise SystemExit("Manifest has no dataset_mixture entries.")

    combined = []
    source_report = []
    for source in sources:
        validate_source(source)
        source_file = args.input_dir / f"{source['id']}.jsonl"
        if not source_file.is_file():
            raise FileNotFoundError(source_file)
        actual_hash = sha256_file(source_file)
        expected_hash = source.get("content_sha256")
        if expected_hash and expected_hash not in {"REPLACE_WITH_SHA256", actual_hash}:
            raise ValueError(f"SHA-256 mismatch for {source['id']}")
        raw_rows = read_jsonl(source_file)
        combined.extend(normalize(row, source["id"]) for row in raw_rows)
        source_report.append({
            "id": source["id"],
            "revision": source["revision"],
            "license": source["license"],
            "sha256": actual_hash,
            "records": len(raw_rows),
        })

    unique = {}
    for row in combined:
        unique.setdefault(fingerprint(row), row)
    records = list(unique.values())
    if len(records) < 20:
        raise ValueError("At least 20 unique examples are required.")

    random.Random(args.seed).shuffle(records)
    test_count = max(1, round(len(records) * args.test))
    validation_count = max(1, round(len(records) * args.validation))
    train_end = len(records) - test_count - validation_count
    if train_end < 1:
        raise ValueError("Not enough records for requested splits.")

    splits = {
        "train": records[:train_end],
        "validation": records[train_end:train_end + validation_count],
        "test": records[train_end + validation_count:],
    }
    args.output_dir.mkdir(parents=True, exist_ok=True)
    for name, rows in splits.items():
        with (args.output_dir / f"{name}.jsonl").open("w", encoding="utf-8") as stream:
            for row in rows:
                stream.write(json.dumps(row, ensure_ascii=False) + "\n")

    report = {
        "seed": args.seed,
        "input_records": len(combined),
        "unique_records": len(records),
        "duplicates_removed": len(combined) - len(records),
        "split_counts": {name: len(rows) for name, rows in splits.items()},
        "sources": source_report,
        "note": "The script checks manifest declarations; license approval remains a human review decision.",
    }
    (args.output_dir / "dataset_report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
