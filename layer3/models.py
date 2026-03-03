from pydantic import BaseModel, Field
from typing import Literal


# ─── Input ────────────────────────────────────────────────────────────────────

class Utterance(BaseModel):
    speaker_id: str
    speaker_label: str = ""
    start_time: float
    end_time: float
    text: str
    language: str = "en"


# ─── Agent 1: Discourse ───────────────────────────────────────────────────────

class TopicSegment(BaseModel):
    topic_label: str = Field(description="Short descriptive label for this topic (3-7 words)")
    start_utterance_index: int = Field(description="Index of the first utterance in this topic segment")
    end_utterance_index: int = Field(description="Index of the last utterance in this topic segment (inclusive)")
    confidence: float = Field(ge=0.0, le=1.0)


class QuestionDetection(BaseModel):
    utterance_index: int
    speaker_id: str
    question_type: Literal["clarification", "decision_seeking", "rhetorical", "open_ended", "confirmation"]
    question_text: str = Field(description="The actual question text extracted from the utterance")
    is_answered_in_transcript: bool = Field(description="Whether a response follows in nearby utterances")
    confidence: float = Field(ge=0.0, le=1.0)


class DiscourseOutput(BaseModel):
    topic_segments: list[TopicSegment]
    questions: list[QuestionDetection]


# ─── Agent 2: Commitment & Decision ──────────────────────────────────────────

class DecisionDetection(BaseModel):
    utterance_index: int
    speaker_id: str
    decision_text: str = Field(description="The decision stated in clear declarative form")
    decision_type: Literal["technical", "process", "prioritization", "resource", "timeline", "scope"]
    agreed_by: list[str] = Field(description="Speaker IDs who explicitly agreed, if detectable")
    confidence: float = Field(ge=0.0, le=1.0)


class CommitmentDetection(BaseModel):
    utterance_index: int
    speaker_id: str
    commitment_text: str = Field(description="The commitment restated in action item form: 'X will do Y [by Z]'")
    owner: str = Field(description="Speaker ID or name of the person who committed")
    deadline_mentioned: str | None = Field(description="Deadline if explicitly mentioned, else null")
    confidence: float = Field(ge=0.0, le=1.0)


class CommitmentOutput(BaseModel):
    decisions: list[DecisionDetection]
    commitments: list[CommitmentDetection]


# ─── Agent 3: Risk ────────────────────────────────────────────────────────────

class RiskSignal(BaseModel):
    utterance_index: int
    speaker_id: str
    risk_type: Literal[
        "timeline_pressure",
        "scope_creep",
        "technical_blocker",
        "resource_constraint",
        "dependency_risk",
        "interpersonal_tension",
        "ambiguity",
        "missing_ownership",
        "budget_concern",
    ]
    risk_text: str = Field(description="The exact utterance or paraphrase that signals the risk")
    severity: Literal["low", "medium", "high"]
    mitigation_suggested: str | None = Field(description="If a mitigation was mentioned in the conversation, extract it")
    confidence: float = Field(ge=0.0, le=1.0)


class RiskOutput(BaseModel):
    risks: list[RiskSignal]
    overall_meeting_risk_level: Literal["low", "medium", "high", "critical"]
    risk_summary: str = Field(description="One sentence summarizing the dominant risk theme of this meeting")


# ─── Combined Layer 3 Output ──────────────────────────────────────────────────

class Layer3Output(BaseModel):
    discourse: DiscourseOutput
    commitments: CommitmentOutput
    risks: RiskOutput
