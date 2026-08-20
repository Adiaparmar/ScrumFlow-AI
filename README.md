# ScrumFlow.ai — AI Scrum Master for Engineering Teams

![ScrumFlow.ai](images/scrumflow_banner.jpg)

*Meetings into Decisions. Decisions into Tasks. Automatically.*

---

## What It Does

ScrumFlow.ai is an AI-powered scrum master that processes sprint planning meeting recordings and converts them into structured, execution-ready artifacts. It listens to what your team discussed, figures out who committed to what, surfaces risks, generates tasks with dependency mapping, and assigns them to the right people based on actual skills and current workload.

No manual note-taking. No "who owns this?" Slack threads. No decisions lost between the meeting and the work.

---

## The Problem

Teams leave sprint planning aligned. Two days later that alignment is gone. Someone has to manually convert conversation into structure, and that someone is usually slow, inconsistent, and already overloaded. Every undocumented decision becomes three Slack threads, two confused engineers, and one delayed release.

The root cause is the absence of persistent organizational memory. ScrumFlow closes that gap automatically, at the moment the conversation happens.

**Built specifically for Indian engineering teams.** Most tools assume clean, single-language speech. Real teams in India switch between Hindi and English mid-sentence. ScrumFlow uses a fine-tuned Hinglish transcription model so your team doesn't have to change how they naturally communicate.

---

## What's Currently Working

- Meeting audio transcription with speaker diarization
- Hinglish / code-switched speech support via Oriserve/Whisper-Hindi2Hinglish-Apex
- Multi-agent analysis pipeline (Discourse, Commitment, Risk, Task Generator agents)
- Structured extraction of decisions, commitments, risks with severity scores
- Dependency-mapped task generation from agent outputs
- Skill and workload based task allocation from team database
- Allocation override with reason logging
- Meeting metrics and speaker analytics dashboard

**Roadmap:** Live meeting joining, automated assignee follow-up and progress tracking.

---

## How It Works

**Step 1: Upload Meeting**
Upload the recording (MP3, MP4, WAV) through the extension.

**Step 2: AI Processing**
The pipeline transcribes the audio, runs diarization to attribute speech to each speaker, then executes the multi-agent pipeline. Three agents run in parallel; the Task Generator runs after all three complete.

**Step 3: View Insights**
Instead of reading a transcript, your team immediately sees decisions made, risks surfaced, commitments identified, tasks generated with owners and dependencies, and allocation suggestions with reasoning.

---

## Multi-Agent Pipeline

The core insight: a single LLM prompt fed the entire transcript produces inconsistent results on real meetings. Breaking reasoning into specialized agents, each responsible for one dimension, made each agent dramatically more accurate.

| Agent | What It Does |
|---|---|
| Discourse Agent | Segments the transcript into coherent topic blocks so downstream agents analyze focused context, not noise |
| Commitment Agent | Extracts who committed to what, by when, with any blockers mentioned |
| Risk Agent | Detects blockers, dependencies, and risk signals with severity scoring (probability x impact) |
| Task Generator | Synthesizes all three agent outputs into dependency-mapped tasks with acceptance criteria (runs sequentially after the other three) |

Post-processing runs in pure Python (no LLM): computes meeting metrics, risk counts by category, and allocation scores using `skill_match x availability_factor` per team member.

---

## Models Used

| Model | Role |
|---|---|
| Oriserve/Whisper-Hindi2Hinglish-Apex | Hinglish speech-to-text transcription |
| Pyannote Precision 2 | Speaker diarization |
| Gemini Flash | Transcript and diarization alignment |
| Gemini 2.5 Flash | Primary reasoning model for all agents |
| Llama 3.3 70B (via OpenRouter) | Automatic fallback if Gemini fails |

All agents return strict JSON schemas validated by Pydantic. On schema failure, the pipeline retries in concise mode (tighter constraints, higher confidence threshold) automatically.

---

## Architecture

![Architecture](images/architecture.png)

Cloud-native AWS stack: EC2 for compute, S3 for storage, SQS for async decoupling between pipeline stages, RDS for team and task data.

SQS was not an optimization. The synchronous first version failed under any concurrent load. Decoupling transcription from agent analysis via SQS meant upload spikes get absorbed by the queue and failed stages retry independently without corrupting downstream outputs.

---

## Demo

![AAES Pipeline Running](images/Screenshot%202026-03-08%20183446.png)
*Pipeline running in terminal: phases, parallel agents with spinners, and the final summary panel*

---

![Main Dashboard](images/Screenshot%202026-03-08%20173416.png)
*Main dashboard: model accuracy trend, override rate, recent allocation suggestions, meeting importance scores*

---

![Meeting Intelligence Overview](images/Screenshot%202026-03-08%20173438.png)
*Meeting importance page: key discussion points, decisions made, importance scoring formula*

---

![Meeting Intelligence Speaker Analysis](images/Screenshot%202026-03-08%20173443.png)
*Speaker analysis: speaking time distribution, turn counts, interruption data per participant*

---

![Diarized Transcript](images/Screenshot%202026-03-08%20173450.png)
*Diarized transcript: every utterance attributed to its speaker and timestamped, displayed in Hinglish as recorded*

---

![Speaker Metrics](images/Screenshot%202026-03-08%20173457.png)
*Speaker metrics: speaking time distribution, donut chart, turn count, interruption statistics*

---

![Upcoming Calendar](images/Screenshot%202026-03-08%20173424.png)
*Meeting calendar: weekly view with meeting details, participants, duration, budget tier, and importance score*

---

![Task Overview](images/Screenshot%202026-03-08%20173504.png)
*Task overview: 11 AI-generated tasks with complexity scoring, dependency count, cross-team impact, and historical completion rate*

---

![Task Detail](images/Screenshot%202026-03-08%20173509.png)
*Task detail: description, complexity breakdown, estimated hours, assignee, allocation history, and dependencies*

---

![Dependency Graph](images/Screenshot%202026-03-08%20173520.png)
*Dependency graph: task relationships and sequencing requirements surfaced from the conversation*

---

![Allocation Engine](images/Screenshot%202026-03-08%20173525.png)
*Allocation engine: AI assignment suggestions with skill match %, load fit %, confidence score, and reasoning*

---

![Modify Assignee](images/Screenshot%202026-03-08%20173532.png)
*Override modal: alternative candidates ranked by skill and load, with reason logging*

---

## Tech Stack

- **Backend:** Python, FastAPI, AWS EC2, S3, SQS, RDS
- **AI / ML:** Gemini 2.5 Flash, Llama 3.3 70B, Whisper (Hinglish fine-tune), Pyannote
- **Frontend:** React
- **Experiment Tracking:** MLflow, Weights and Biases
- **Dev Tooling:** Docker, Git, Kiro (spec-driven development)

---

## Infrastructure Costs (Current: EC2-Only)

| Service | Purpose | Estimated Monthly Cost |
|---|---|---|
| EC2 (t3.large + c6i.xlarge) | API server + processing | ~$180-220 |
| S3 + SQS + RDS | Storage, queue, database | ~$30-50 |
| Pyannote API | Speaker diarization | ~$0.16 / hr audio |
| Gemini 2.5 Flash | Agent reasoning | ~$0.35 / 1M tokens |
| OpenRouter Llama 70B | Fallback inference | ~$0 |

Moving to reserved EC2 instances and Savings Plans reduces compute costs by 30-40% at scale.

---
