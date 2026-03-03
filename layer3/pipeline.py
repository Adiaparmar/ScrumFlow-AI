"""
AAES Full Pipeline — Master CLI Runner

Orchestrates the complete post-meeting processing pipeline:

  Layer 3 (3 LLM agents, parallel):
    Agent 1: Discourse  — topic segmentation + question detection
    Agent 2: Commitment — decisions + commitments
    Agent 3: Risk       — risk signal detection

  Layer 3.5 (1 LLM agent, sequential — needs Layer 3 output):
    Agent 4: Task Generator — structured task objects + dependency edges

  Post-Processor (pure Python, no LLM):
    - Meeting metrics: duration, decision_density, task_creation_count
    - Risk quantification: objective counts by type and severity
    - Allocation scoring: skill_match%, load_fit%, confidence% per task

Usage:
    python pipeline.py --input layer3/sample_meeting.json --output aaes_output.json
    python pipeline.py --input layer3/aligned_output.json --employees layer3/mock_employees.json
"""

import json
import time
import argparse
from pathlib import Path

from agents import (
    load_transcript,
    run_layer3,
    run_task_agent,
)
from post_processor import run_post_processor


def run_full_pipeline(
    input_path: str,
    employees_path: str = None,
    verbose: bool = True,
) -> dict:

    # ── Load transcript ─────────────────────────────────────────────────────
    utterances = load_transcript(input_path)
    if verbose:
        print(f"Loaded {len(utterances)} utterances from {input_path}")

    # ── Layer 3: 3 agents in parallel ───────────────────────────────────────
    if verbose:
        print("\n[Phase 1] Running Layer 3 understanding agents...")
    layer3_output = run_layer3(utterances, verbose=verbose)

    # ── Layer 3.5: Task Generator (sequential, uses L3 output) ──────────────
    if verbose:
        print("\n[Phase 2] Running Task Generator agent...")
    task_output = run_task_agent(layer3_output, verbose=verbose)

    # ── Post-Processor: pure Python computations ─────────────────────────────
    if verbose:
        print("\n[Phase 3] Running post-processor (meeting metrics + allocation scoring)...")

    aaes_output = run_post_processor(
        utterances=utterances,
        layer3_output=layer3_output.model_dump(),
        task_output=task_output,
        employees_path=employees_path,
    )

    if verbose:
        _print_pipeline_summary(aaes_output)

    return aaes_output


def _print_pipeline_summary(output: dict) -> None:
    print(f"\n{'='*60}")
    print("  AAES Pipeline Summary")
    print(f"{'='*60}")

    meta = output.get("meeting_metadata", {})
    print(f"\n  Meeting Metrics:")
    print(f"    Duration          : {meta.get('duration_minutes', 0):.1f} min")
    print(f"    Decisions made    : {meta.get('decision_count', 0)}")
    print(f"    Decision density  : {meta.get('decision_density', 0):.3f} decisions/min")
    print(f"    Tasks created     : {meta.get('task_creation_count', 0)}")




def main():
    parser = argparse.ArgumentParser(
        description="AAES Full Pipeline — meeting transcript → execution intelligence"
    )
    parser.add_argument(
        "--input", required=True,
        help="Path to the meeting transcript JSON file"
    )
    parser.add_argument(
        "--output", default="aaes_output.json",
        help="Path to save the final AAES JSON output (default: aaes_output.json)"
    )
    parser.add_argument(
        "--employees", default=None,
        help="Path to employee dataset JSON (default: mock_employees.json in same folder)"
    )
    parser.add_argument(
        "--quiet", action="store_true",
        help="Suppress verbose output"
    )
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        raise FileNotFoundError(f"Input file not found: {input_path}")

    start = time.time()

    result = run_full_pipeline(
        input_path=str(input_path),
        employees_path=args.employees,
        verbose=not args.quiet,
    )

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    elapsed = time.time() - start
    print(f"\nOutput saved → {output_path}")
    print(f"Total pipeline runtime: {elapsed:.2f}s")


if __name__ == "__main__":
    main()
