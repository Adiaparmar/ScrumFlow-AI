"""
Layer 3: Understanding Layer — Agent Runner

Orchestrates 3 agents in parallel against a meeting transcript.

Usage:
    python agents.py --input transcript.json --output layer3_output.json

"""

import json
import os
import time
import argparse
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

import google.genai as genai
from google.genai import types as genai_types
from openai import OpenAI
from pydantic import ValidationError
from dotenv import load_dotenv

from models import (
    Utterance, DiscourseOutput, CommitmentOutput, RiskOutput, Layer3Output
)
from prompts import (
    DISCOURSE_SYSTEM_PROMPT,
    COMMITMENT_SYSTEM_PROMPT,
    RISK_SYSTEM_PROMPT,
    TASK_AGENT_SYSTEM_PROMPT,
)


load_dotenv()

# ─── Client Configuration ─────────────────────────────────────────────────────

# Primary: Gemini direct API
_gemini = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
PRIMARY_MODEL = "gemini-2.5-flash" 

# Fallback: Llama 3.3 70B
_openrouter = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.environ.get("OPENROUTER_API_KEY", ""),
)
FALLBACK_MODEL = "meta-llama/llama-3.3-70b-instruct"

MAX_RETRIES = 3
RETRY_DELAY = 2.0


# ─── Utilities ────────────────────────────────────────────────────────────────

def load_transcript(json_path: str) -> list[dict]:
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if isinstance(data, dict):
        return data.get("conversation", data.get("utterances", []))
    return data 

_MIN_WORDS = 3


_NOISE_MARKERS = {"[inaudible]", "[noise]", "[music]", "[laughter]", "[applause]", "[crosstalk]"}

_PURE_FILLERS = {
    "haan", "hmm", "hm", "uh", "um", "okay", "ok", "right",
    "bye", "thanks", "nahi", "oh", "ah", "err", "ha",
}


def _is_noise_utterance(text: str) -> bool:
    stripped = text.strip()
    if not stripped:
        return True
    # Punctuation-only
    if all(not c.isalnum() for c in stripped):
        return True
    # Whisper noise marker
    if stripped.lower() in _NOISE_MARKERS:
        return True
    # Tokenise to content words only
    words = [w.strip(".,!?;:\"'()[]").lower() for w in stripped.split()]
    content = [w for w in words if w and any(c.isalnum() for c in w)]
    if len(content) < _MIN_WORDS:
        return True
    return False


def build_numbered_utterances(utterances: list[dict]) -> list[dict]:

    result = []
    idx = 0
    for u in utterances:
        raw = u.get("text", u.get("content", u.get("transcript", ""))) or ""
        text = raw.strip()
        if _is_noise_utterance(text):
            continue
        sid   = u.get("speaker_id", u.get("speaker", "SPEAKER_00"))
        label = u.get("speaker_label", sid)
        result.append({
            "index"       : idx,
            "speaker_id"  : sid,
            "speaker_name": label,
            "start_time"  : u.get("start_time", u.get("start", 0.0)),
            "end_time"    : u.get("end_time",   u.get("end",   0.0)),
            "text"        : text,
        })
        idx += 1
    return result


def _call_gemini(system_prompt: str, user_message: str, agent_name: str) -> str:
    response = _gemini.models.generate_content(
        model=PRIMARY_MODEL,
        contents=user_message,
        config=genai_types.GenerateContentConfig(
            system_instruction=system_prompt,
            temperature=0.1,
            max_output_tokens=8192,
            response_mime_type="application/json",
        ),
    )
    return response.text.strip()


def _call_openrouter(system_prompt: str, user_message: str, agent_name: str) -> str:
    response = _openrouter.chat.completions.create(
        model=FALLBACK_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        temperature=0.1,
        max_tokens=8192,
        response_format={"type": "json_object"},
        extra_headers={
            "HTTP-Referer": "https://scrumflow.ai",
            "X-Title": f"ScrumFlow Layer3 {agent_name}",
        },
    )
    return response.choices[0].message.content.strip()


def call_agent(
    system_prompt: str,
    utterances_json: str,
    agent_name: str,
    use_fallback: bool = False,
) -> str:
    user_message = f"Analyze the following meeting utterances:\n\n{utterances_json}"
    call_fn = _call_openrouter if use_fallback else _call_gemini
    model_label = FALLBACK_MODEL if use_fallback else PRIMARY_MODEL

    for attempt in range(MAX_RETRIES):
        try:
            return call_fn(system_prompt, user_message, agent_name)
        except Exception as e:
            wait = RETRY_DELAY * (2 ** attempt)
            print(f"[{agent_name}] {model_label} attempt {attempt + 1} failed: {e}. Retrying in {wait:.1f}s...")
            time.sleep(wait)
            if attempt == MAX_RETRIES - 1 and not use_fallback:
                print(f"[{agent_name}] Gemini failed. Switching to fallback ({FALLBACK_MODEL})...")
                return call_agent(system_prompt, utterances_json, agent_name, use_fallback=True)
            if attempt == MAX_RETRIES - 1:
                raise


def parse_and_validate(raw_json: str, model_class, agent_name: str):
    try:
        data = json.loads(raw_json)
        return model_class(**data)
    except json.JSONDecodeError as e:
        raise ValueError(f"[{agent_name}] Model returned invalid JSON: {e}\nRaw:\n{raw_json[:500]}")
    except ValidationError as e:
        raise ValueError(f"[{agent_name}] Schema validation failed:\n{e}\nRaw:\n{raw_json[:500]}")


# ─── Three Agent Functions ────────────────────────────────────────────────────

def run_discourse_agent(utterances_json: str) -> DiscourseOutput:
    raw = call_agent(DISCOURSE_SYSTEM_PROMPT, utterances_json, "DiscourseAgent")
    return parse_and_validate(raw, DiscourseOutput, "DiscourseAgent")


def run_commitment_agent(utterances_json: str) -> CommitmentOutput:
    raw = call_agent(COMMITMENT_SYSTEM_PROMPT, utterances_json, "CommitmentAgent")
    return parse_and_validate(raw, CommitmentOutput, "CommitmentAgent")


def run_risk_agent(utterances_json: str) -> RiskOutput:
    raw = call_agent(RISK_SYSTEM_PROMPT, utterances_json, "RiskAgent")
    return parse_and_validate(raw, RiskOutput, "RiskAgent")


def run_task_agent(layer3_output: Layer3Output, verbose: bool = True) -> dict:

    agent_input = {
        "commitments": [
            c.model_dump() if hasattr(c, "model_dump") else c
            for c in layer3_output.commitments.commitments
        ],
        "decisions": [
            d.model_dump() if hasattr(d, "model_dump") else d
            for d in layer3_output.commitments.decisions
        ],
        "risks": [
            r.model_dump() if hasattr(r, "model_dump") else r
            for r in layer3_output.risks.risks
        ],
    }
    input_json = json.dumps(agent_input, ensure_ascii=False, indent=2)

    raw = call_agent(TASK_AGENT_SYSTEM_PROMPT, input_json, "TaskAgent")

    try:
        result = json.loads(raw)
        if verbose:
            task_count = len(result.get("tasks", []))
            edge_count = len(result.get("dependency_edges", []))
            print(f"  ✓ Task Agent complete — {task_count} tasks, {edge_count} dependency edges")
        return result
    except json.JSONDecodeError as e:
        raise ValueError(f"[TaskAgent] Invalid JSON: {e}\nRaw:\n{raw[:500]}")


# ─── Orchestrator ─────────────────────────────────────────────────────────────

def run_layer3(utterances: list[dict], verbose: bool = True) -> Layer3Output:
    if verbose:
        print(f"\n{'='*60}")
        print(f"Layer 3 Understanding Layer")
        print(f"Model: {PRIMARY_MODEL} (fallback: {FALLBACK_MODEL})")
        print(f"{'='*60}")

 
    numbered = build_numbered_utterances(utterances)
    utterances_json = json.dumps(numbered, ensure_ascii=False, indent=2)

    if verbose:
        print(f"  Utterances sent to agents: {len(numbered)}")

    results = {}
    errors = {}

    agent_fns = {
        "discourse": (run_discourse_agent, utterances_json),
        "commitment": (run_commitment_agent, utterances_json),
        "risk": (run_risk_agent, utterances_json),
    }

    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = {
            executor.submit(fn, arg): name
            for name, (fn, arg) in agent_fns.items()
        }

        for future in as_completed(futures):
            name = futures[future]
            try:
                result = future.result()
                results[name] = result
                if verbose:
                    print(f"  ✓ {name.capitalize()} Agent complete")
            except Exception as e:
                errors[name] = str(e)
                print(f"  ✗ {name.capitalize()} Agent FAILED: {e}")

    if errors:
        raise RuntimeError(f"One or more agents failed:\n" + "\n".join(f"  {k}: {v}" for k, v in errors.items()))

    return Layer3Output(
        discourse=results["discourse"],
        commitments=results["commitment"],
        risks=results["risk"],
    )


# ─── CLI Entry Point ──────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Run Layer 3 Understanding Layer agents")
    parser.add_argument("--input", required=True, help="Path to Layer 1 JSON transcript file ({\"conversation\": [...]} format)")
    parser.add_argument("--output", default="layer3_output.json", help="Path to save Layer 3 JSON output")
    parser.add_argument("--quiet", action="store_true", help="Suppress verbose output")
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        raise FileNotFoundError(f"Transcript file not found: {input_path}")

    utterances = load_transcript(str(input_path))
    print(f"Loaded {len(utterances)} utterances from {input_path}")

    start_time = time.time()
    output = run_layer3(utterances, verbose=not args.quiet)
    elapsed = time.time() - start_time

    # Save output
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output.model_dump(), f, ensure_ascii=False, indent=2)

    print(f"Layer 3 output saved → {output_path}")
    print(f"Total runtime: {elapsed:.2f}s")


if __name__ == "__main__":
    main()
