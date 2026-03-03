"""
Layer 3.5 Post-Processor

Takes Layer 3 output + task objects + employee dataset and computes:
  1. Meeting metrics  : duration, decision_density, task_creation_count
  2. Risk quantification: objective risk_counts (replaces narrative summary)
  3. Allocation scoring : skill_match%, load_fit%, confidence% per task

All formulas are documented inline as required by AAES PRD objectivity principle.
"""

import json
import math
from pathlib import Path


# ─── Employee Loading ─────────────────────────────────────────────────────────

def load_employees(path: str = None) -> list[dict]:
    if path is None:
        path = Path(__file__).parent / "mock_employees.json"
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data["employees"]


# ─── 1. Meeting Metrics ───────────────────────────────────────────────────────

def compute_meeting_metrics(
    utterances: list[dict],
    decisions: list[dict],
    commitments: list[dict],
) -> dict:

    if not utterances:
        return {
            "duration_seconds": 0,
            "duration_minutes": 0.0,
            "decision_count": 0,
            "task_creation_count": 0,
            "decision_density": 0.0,
        }

    start_times = [u.get("start_time", u.get("start", 0.0)) for u in utterances]
    end_times   = [u.get("end_time",   u.get("end",   0.0)) for u in utterances]

    duration_seconds = max(end_times) - min(start_times)
    duration_minutes = round(duration_seconds / 60, 2)

    decision_count      = len(decisions)
    task_creation_count = len(commitments)  

    decision_density = (
        round(decision_count / duration_minutes, 3)
        if duration_minutes > 0 else 0.0
    )

    return {
        "duration_seconds": round(duration_seconds, 2),
        "duration_minutes": duration_minutes,
        "decision_count": decision_count,
        "task_creation_count": task_creation_count,
        "decision_density": decision_density,
    }


# ─── 2. Risk Quantification ───────────────────────────────────────────────────

def quantify_risks(risks: list[dict]) -> dict:
    risk_counts: dict[str, int] = {}
    severity_counts = {"high": 0, "medium": 0, "low": 0}

    for r in risks:
        rtype = r.get("risk_type", "unknown")
        risk_counts[rtype] = risk_counts.get(rtype, 0) + 1
        sev = r.get("severity", "low")
        severity_counts[sev] = severity_counts.get(sev, 0) + 1

    return {
        "risk_counts": risk_counts,
        "total_risk_signals": len(risks),
        "by_severity": severity_counts,
    }


# ─── 3. Allocation Scoring ────────────────────────────────────────────────────

def _skill_match(task_skills: list[str], employee_skills: list[str]) -> float:
    if not task_skills:
        return 0.0
    task_set = set(s.lower() for s in task_skills)
    emp_set  = set(s.lower() for s in employee_skills)
    overlap  = len(task_set & emp_set)
    return round(overlap / len(task_set) * 100, 1)


def _load_fit(
    current_load: float,
    task_hours: float,
    capacity: float,
) -> float:
    if capacity <= 0:
        return 0.0
    fit = max(0.0, 1.0 - (current_load + task_hours) / capacity)
    return round(fit * 100, 1)


def _confidence(
    skill_match: float,
    load_fit: float,
    historical_rate: float,
) -> float:

    return round(
        0.50 * skill_match
        + 0.30 * load_fit
        + 0.20 * (historical_rate * 100),
        1,
    )


def _reasoning_bullets(
    employee: dict,
    task: dict,
    skill_match: float,
    load_fit: float,
    ranked_position: int,
) -> list[str]:

    bullets = []

    # Skill match bullet
    task_skills = task.get("skill_tags", [])
    emp_skills  = employee["skills"]
    matched = [s for s in task_skills if s.lower() in [e.lower() for e in emp_skills]]
    bullets.append(
        f"Skill match: {skill_match:.0f}% ({len(matched)}/{len(task_skills)} required skills: {', '.join(matched[:3]) or 'none'})"
    )

    # Load fit bullet
    current = employee["current_load_hours_week"]
    cap     = employee["capacity_hours_week"]
    hours   = task.get("estimated_hours", 0)
    bullets.append(
        f"Workload: {current}h/week current load + {hours}h task = {current + hours}h "
        f"vs {cap}h capacity ({load_fit:.0f}% fit)"
    )

    # Historical completion rate
    rate = round(employee["historical_completion_rate"] * 100, 0)
    bullets.append(
        f"Historical completion rate: {rate:.0f}% across {employee['role']} task types"
    )

    # Rank among alternatives
    if ranked_position == 0:
        bullets.append(f"Highest combined score among available team members")
    else:
        bullets.append(f"Ranked #{ranked_position + 1} among available team members")

    return bullets


def score_allocations(tasks: list[dict], employees: list[dict]) -> list[dict]:

    suggestions = []

    for task in tasks:
        task_skills = task.get("skill_tags", [])
        task_hours  = task.get("estimated_hours", 8)

        scored = []
        for emp in employees:
            sm = _skill_match(task_skills, emp["skills"])
            lf = _load_fit(emp["current_load_hours_week"], task_hours, emp["capacity_hours_week"])
            cf = _confidence(sm, lf, emp["historical_completion_rate"])
            scored.append({
                "employee": emp,
                "skill_match": sm,
                "load_fit": lf,
                "confidence": cf,
            })

        # Sort by confidence descending
        scored.sort(key=lambda x: x["confidence"], reverse=True)

        if not scored:
            continue

        primary   = scored[0]
        alternates = scored[1:3]

        emp = primary["employee"]
        reasoning = _reasoning_bullets(
            emp,
            task,
            primary["skill_match"],
            primary["load_fit"],
            ranked_position=0,
        )

        suggestion = {
            "task_id": task["task_id"],
            "task_title": task["title"],
            "source_meeting_commitment": task.get("notes"),
            "owner_suggested_by_transcript": task.get("owner_name"),
            "deadline_text": task.get("deadline_text"),
            "suggested_assignee_id": emp["employee_id"],
            "suggested_assignee_name": emp["name"],
            "suggested_assignee_role": emp["role"],
            "skill_match_percentage": primary["skill_match"],
            "load_fit_percentage": primary["load_fit"],
            "confidence_score": primary["confidence"],
            "reasoning": reasoning,
            "alternative_suggestions": [
                {
                    "employee_id": alt["employee"]["employee_id"],
                    "employee_name": alt["employee"]["name"],
                    "role": alt["employee"]["role"],
                    "skill_match": alt["skill_match"],
                    "load_fit": alt["load_fit"],
                    "confidence": alt["confidence"],
                }
                for alt in alternates
            ],
        }
        suggestions.append(suggestion)

    return suggestions


# ─── Master Post-Processor ────────────────────────────────────────────────────

def run_post_processor(
    utterances: list[dict],
    layer3_output: dict,
    task_output: dict,
    employees_path: str = None,
) -> dict:

    employees   = load_employees(employees_path)
    decisions   = layer3_output.get("commitments", {}).get("decisions", [])
    commitments = layer3_output.get("commitments", {}).get("commitments", [])
    risks       = layer3_output.get("risks", {}).get("risks", [])
    tasks       = task_output.get("tasks", [])
    dep_edges   = task_output.get("dependency_edges", [])

    speaker_map: dict[str, str] = {}
    for u in utterances:
        sid   = u.get("speaker_id", "")
        label = u.get("speaker_label", "")
        if sid and label and label.strip() != sid:
            speaker_map[sid] = label.strip()

    meeting_metrics        = compute_meeting_metrics(utterances, decisions, commitments)
    risk_quantified        = quantify_risks(risks)
    allocation_suggestions = score_allocations(tasks, employees)

    return {
        "schema_version": "1.0",
        "meeting_metadata": meeting_metrics,
        "speaker_map": speaker_map,
        "risk_quantification": risk_quantified,
        "tasks": tasks,
        "dependency_edges": dep_edges,
        "allocation_suggestions": allocation_suggestions,
        "layer3_raw": {
            "discourse":    layer3_output.get("discourse", {}),
            "commitments":  layer3_output.get("commitments", {}),
            "risks":        layer3_output.get("risks", {}),
        },
    }
