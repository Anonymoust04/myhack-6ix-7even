# Ecosystem Linkage Automation — Hackathon Summary

## Table of Contents

- [Problem Statement](#problem-statement)
- [Solution Overview](#solution-overview)
- [Core Entities](#core-entities)
- [Pain Points by Entity](#pain-points-by-entity)
- [Six Core Capabilities](#six-core-capabilities)
- [Key Concept: First-Class Entities](#key-concept-first-class-entities)
- [Matching Approach: Hybrid (Vector Search + Agent Reasoning)](#matching-approach)
- [Full Matching Matrix](#full-matching-matrix)
- [Google AI Tools: Gemini Enterprise Agent Platform](#google-ai-tools)
- [Architecture](#architecture)
- [User Flows](#user-flows)
- [Database Schema](#database-schema)
- [Implementation Plan (24 Hours)](#implementation-plan)

---

## Problem Statement

Regional innovation ecosystems (accelerators, startup hubs, networks) rely on **manual coordination** to match mentors to companies, assign participants to programmes, and manage partner relationships.

**Current state:** Relationships are ad hoc, one-off assignments — typically managed in spreadsheets. No system remembers what worked or why.

**Core issue:** The platform does not treat ecosystem relationships as first-class entities that can be defined, automated, governed, and reused across different contexts.

**Why it matters:**

- Manual coordination limits scalability
- Creates operational bottlenecks
- No learning from previous engagements
- Weakens consistency as participation expands
- Hard to replicate across geographies

**Design challenge:** How might we design an AI-enabled platform that treats ecosystem relationships as first-class, programmable entities, so that linkages can be created, managed, reused, and improved automatically across programmes, countries, and ecosystem actors?

---

## Solution Overview

Build an AI-enabled platform that automates and manages ecosystem relationships as reusable, programmable entities — serving both administrators and participants.

**One sentence:** Participants and admins join the platform → AI recommends programmes, mentors, and partners based on fit → participants can be interested/not interested → system tracks outcomes → AI gets smarter for next time.

The platform:

1. Structures relationships as programmable, managed entities
2. Automates matching and recommendations based on fit, not admin availability
3. Recommends relevant programmes/hackathons to participants
4. Captures outcomes (skills gained, funding, hires, pivots)
5. Learns continuously from past engagement data
6. Enables reuse across programmes and geographies
7. Scales operations without proportional admin overhead

---

## Core Entities

| Entity | Who They Are | Example |
|--------|-------------|---------|
| **Participants** | Students, workers, individuals who join programmes/hackathons | "CS student interested in AI + fintech, beginner level" |
| **Companies** | Startups in the ecosystem | "Seed-stage fintech startup needing regulatory guidance" |
| **Mentors** | Experienced advisors guiding participants or companies | "10 years fintech, regulatory compliance expertise" |
| **Programmes** | Accelerators, hackathons, bootcamps, workshops | "AI Fintech Hackathon 2026, beginner-friendly" |
| **Partners** | Service providers, investors, corporates, universities, government agencies | "Legal firm specialising in fintech compliance" |
| **Programme Administrators** | Operators managing the ecosystem | Programme owners, ecosystem managers |

**Key relationships:**

- Participant ↔ Programme (recommended programmes for participants)
- Participant ↔ Mentor (mentor guidance within programmes)
- Mentor ↔ Company (mentor advisory for startups)
- Company ↔ Programme (accelerator/cohort assignment)
- Partner ↔ Programme/Company (service provision)
- Administrator ↔ all (governance and oversight)

---

## Pain Points by Entity

### Participants (Students/Workers)

- Browse programmes manually — no personalised recommendations
- No visibility into which programmes match their skills, interests, or goals
- Experience level mismatch — join programmes too advanced or too basic
- No continuity — past programme participation doesn't inform future recommendations
- No guidance on which mentors could help them within a programme

**Improvement:** AI-powered programme recommendations based on profile (skills, interests, goals, experience level), mentor suggestions within programmes, outcome tracking (skills gained, projects built, jobs landed), and learning loop that improves recommendations over time.

### Companies (Startups)

- Hit-or-miss mentor quality based on admin availability, not fit
- Slow access to relevant services (legal, cloud, investors)
- Duplicated work across programmes — relationships restart from scratch
- Limited visibility into what mentors/partners are available

**Improvement:** Better mentor matches via algorithm, faster partner access, relationship continuity across programmes, proactive suggestions.

### Mentors

- Assigned to startups or participants they can't effectively help (wrong stage/sector)
- No capacity management or engagement tracking
- Relationships end after one programme; must re-onboard for next cohort
- No visibility into whether their mentoring drove results

**Improvement:** Relevant assignments, capacity tracking, cross-programme continuity, impact feedback showing outcomes.

### Programmes (Accelerators/Hackathons/Cohorts)

- Admin time spent on assignments instead of strategy
- Inconsistent participant quality across cohorts
- No learning from Cohort A to improve Cohort B
- Hard to scale geographically
- Participants may not match programme difficulty or focus

**Improvement:** Reduced admin burden, better-matched participants, consistent outcomes, cross-cohort learning, geographic scalability via reusable templates.

### Partners (Service Providers, Investors, Corporates)

- Ad hoc engagement — unclear which companies/participants need their services
- Underutilised capacity
- Relationship starts/stops per programme
- No feedback loop on impact

**Improvement:** Targeted introductions, visibility into supply/demand, recurring engagement, outcome tracking.

### Programme Administrators

- Manual grunt work (spreadsheets, emails, tracking)
- Scaling bottleneck — more participants = proportional admin work
- Inconsistent rules across cohorts/regions
- No data-driven decisions

**Improvement:** Automated matching/tracking/notifications, operational scalability, consistent processes, data insights.

---

## Six Core Capabilities

### 1. Structure Relationships as Programmable Entities

Store relationships as database objects with defined fields (type, participants, status, history, outcomes) — not spreadsheet rows. Enables querying: "Show all participants in fintech programmes with completion rate > 80%."

### 2. Automate Matching and Recommendations

System recommends programmes to participants, mentors to companies, and partners to initiatives — all algorithmically. Participants see personalised recommendations on login. Admins review and approve. Faster, objective, consistent, scalable.

### 3. Capture Outcomes

Log results from each connection: skills gained, projects completed, funding raised, hires made, pivot decisions. This is the data fuel for improvement. Without it, you can't learn.

### 4. Learn Continuously

Use historical outcome data to improve recommendations. Example: if participants with "Python + data analysis" skills historically succeed in AI hackathons, increase that programme's recommendation weight for similar profiles. System gets smarter with each cohort.

### 5. Enable Reuse

Successful matching patterns replicated across programmes, regions, and initiatives without rebuilding from scratch. Knowledge transfer across geographies and time.

### 6. Scale Operations

Reduce manual work, ensure consistent rules, handle growth without proportional staff increase. 10x more participants with the same team.

**Interconnection:** Structure → enables automation → generates data → feeds learning → improves matching → spreads via reuse → proves scalability.

---

## Key Concept: First-Class Entities

**First-class entity** = the system treats relationships as core data objects with their own properties, rules, and lifecycle.

Instead of: "Assign participant Sarah to Hackathon X" (one-time action)

Think: A structured relationship object the system can query, update, automate, and learn from.

This is essentially a **knowledge graph + intelligent automation engine** — nodes (participants, mentors, companies, programmes) and edges (relationships) with metadata, plus AI matching logic, learning loops, programmable rules, and reusability.

---

## Matching Approach

### Why Hybrid (Vector Search + Agent Reasoning)

**Agent-only (brute force):** Score every participant-programme pair with Gemini. Works for small datasets but scales quadratically (500 participants × 50 programmes × multiple entity types = massive API calls).

**Vector DB only:** Fast similarity search but no explainability — just a similarity score with no reasoning.

**Hybrid (recommended):**

1. **Vector Search narrows the field** — for each participant, find top 10 most relevant programmes (fast, cheap, deterministic)
2. **Gemini Agent does deep scoring** — score only 10 pairs instead of 50 (smart, explainable)

**Result:** Major reduction in API calls. Vector DB handles retrieval ("what could match?"), Agent handles reasoning ("how good is this match, and why?").

### How Matching Logic Works

1. **Rule-based filtering** — eliminate obvious mismatches (advanced programme + beginner participant)
2. **Vector similarity** — find top N candidates by embedding distance
3. **Gemini scoring** — score each candidate pair across dimensions (skills overlap, interest alignment, experience level fit, past success rate)
4. **Ranking** — sort by match score, resolve conflicts
5. **Learning** — track outcomes, adjust weights, retrain for next cohort

---

## Full Matching Matrix

| From → To | What It Does | Example |
|-----------|-------------|---------|
| **Participant → Programme** | Recommend relevant programmes/hackathons | "This AI hackathon matches your skills and goals" |
| **Participant → Mentor** | Suggest mentors within a programme | "This mentor can help with your learning goals" |
| **Mentor → Participant** | Recommend participants to mentor | "These participants need guidance in your area" |
| **Mentor → Company** | Match mentors to startups | "Your fintech expertise fits this startup's needs" |
| **Company → Programme** | Recommend accelerators/cohorts | "This accelerator matches your stage and sector" |
| **Company → Partner** | Recommend service providers | "This legal firm specialises in your regulatory needs" |
| **Partner → Programme** | Connect partners to initiatives | "This programme needs your cloud services" |
| **Programme → Participant** | Recruit fitting participants | "These students qualify for your hackathon" |

---

## Google AI Tools

### Gemini Enterprise Agent Platform (formerly Vertex AI)

As of April 2026, Vertex AI has been rebranded to **Gemini Enterprise Agent Platform**. All previous Vertex AI services are now under this platform.

**Platform structure:**

| Menu | Services |
|------|----------|
| **Build** | Agent Garden, ADK, MCP Servers, RAG Engine, Vector Search, Search |
| **Scale** | Deployments (Agent Runtime), Memory Bank, Sessions |
| **Govern** | Agent Registry, Policies, Gateways, Security |

**Key services for the hackathon:**

| Service | What It Does |
|---------|-------------|
| **Gemini API** (under Models) | LLM for matching reasoning and scoring |
| **Vector Search** (under Build) | Similarity search for candidate filtering |
| **Agent Runtime** (under Scale) | Deploy and run your matching agent |
| **Agent Development Kit (ADK)** | Code-first framework to build your agent |
| **Firestore** (separate product) | Database for profiles, relationships, outcomes |

### Two Vector Search Options

**Option A: Firestore with built-in vector search (simpler)**

- Embeddings stored alongside regular document data
- `find_nearest()` query on collection
- One database for everything
- Best for: small-medium datasets, rapid prototyping
- Setup: 5 minutes

**Option B: Agent Platform Vector Search (heavier, more scalable)**

- Dedicated vector index on Cloud Storage
- Deployed endpoint with k-NN API
- Scales to billions of vectors
- Best for: large-scale production, impressing judges
- Setup: 30+ minutes for index build + deploy

**Pipeline for Option B:**

```
Generate Embeddings (Gemini Embeddings API)
    → Upload to Cloud Storage (JSON format)
    → Create Index (MatchingEngineIndex)
    → Deploy to Endpoint (MatchingEngineIndexEndpoint)
    → Query for Nearest Neighbours (find_neighbors)
    → Pass top candidates to Gemini Agent for deep scoring
```

---

## Architecture

```
Frontend (React)
├── Participant view (profile, recommendations, my programmes)
├── Admin view (create programmes, matching, approve/reject, analytics)
├── Mentor view (assigned participants/companies)
    ↓ REST API
Backend (Cloud Run)
    ↓
Agent Platform
├── ADK (build matching + recommendation agent)
├── Gemini API (reasoning + scoring)
├── Agent Runtime (deploy agent)
└── Vector Search (candidate filtering)
    ↓
Firestore (profiles, relationships, embeddings, outcomes)
```

### Backend Endpoints

```
# Participant endpoints
POST /api/register-participant   — Participant signs up with profile
POST /api/update-profile         — Update own profile
GET  /api/recommendations        — Get recommended programmes/mentors
POST /api/register-programme     — Express interest / register for a programme
GET  /api/my-programmes          — View enrolled programmes
POST /api/participant-outcome    — Log post-programme outcomes

# Admin endpoints
POST /api/upload-mentors         — Upload mentor profiles
POST /api/upload-companies       — Upload company profiles
POST /api/create-programme       — Create a programme/hackathon
POST /api/run-matching           — Trigger matching agent
GET  /api/matches                — Fetch ranked matches
POST /api/assign                 — Assign a relationship
POST /api/approve-registration   — Approve participant registration
GET  /api/analytics              — Get insights from past data

# Shared endpoints
POST /api/outcomes               — Log an outcome
GET  /api/relationship/:id       — View relationship detail
```

### How the Agent Works

The agent is built with ADK and given tools:

- `get_participants()` — fetch from Firestore
- `get_mentors()` — fetch from Firestore
- `get_companies()` — fetch from Firestore
- `get_programmes()` — fetch from Firestore
- `find_similar()` — query Vector Search for nearest neighbours
- `store_relationship()` — save to Firestore
- `get_past_outcomes()` — analyse history

The agent autonomously:

1. Reads participant/company/mentor profiles from Firestore
2. Uses Vector Search to find top candidates across entity types
3. For each candidate pair: reasons about fit, scores 0-1
4. Stores high-scoring matches as recommended relationships
5. Uses past outcome data to improve scoring weights

---

## User Flows

### Participant Flow

**Step 1: Participant Signs Up**
- Selects role: Student / Worker / Freelancer
- Fills profile: name, skills, interests, experience level, goals, location
- Example: "Sarah Tan, Python + data analysis, interested in AI + fintech, beginner, wants to learn startup building, Kuala Lumpur"

**Step 2: System Generates Recommendations**
- On profile submission, backend triggers recommendation engine
- Vector Search finds nearest programmes by skills/interests/goals
- Gemini Agent scores fit, explains reasoning, flags mismatches (e.g. experience level too low)

**Step 3: Participant Sees Dashboard**

The dashboard has two layers of AI-generated content:

**Layer 1 — Top-level summary:** One Gemini call per participant on profile submission. Generates a personalised paragraph explaining the overall match rationale, referencing past outcome data from similar participants.

**Layer 2 — Per-match reasoning:** Already generated during matching (stored as `reasoning` and `fit_factors` in Firestore). Just displayed — no extra AI calls needed. Includes warning flags (⚠) for partial mismatches.

```
┌─────────────────────────────────────────────────────────┐
│  Welcome, Sarah                                          │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ 🤖 Your Match Summary                               │ │
│  │                                                     │ │
│  │ Based on your skills (Python, data analysis),       │ │
│  │ interest in AI + fintech, and beginner experience   │ │
│  │ level, we found 3 programmes that fit your profile. │ │
│  │ Your strongest match is the AI Fintech Hackathon    │ │
│  │ — past participants with similar profiles had an    │ │
│  │ 85% completion rate and reported gaining practical  │ │
│  │ API design skills.                                  │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
│  Recommended Programmes:                                 │
│                                                          │
│  ✦ AI Fintech Hackathon 2026              94% fit       │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Why this matches:                                   │ │
│  │ • AI + fintech focus aligns with your interests     │ │
│  │ • Beginner-friendly — matches your experience level │ │
│  │ • Based in KL — matches your location               │ │
│  │ • Similar participants gained React + API skills    │ │
│  └─────────────────────────────────────────────────────┘ │
│  [Register]                                              │
│                                                          │
│  ✦ Startup Building Bootcamp               88% fit      │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Why this matches:                                   │ │
│  │ • Directly addresses your goal: "learn startup      │ │
│  │   building"                                         │ │
│  │ • Covers fundamentals suitable for beginners        │ │
│  │ • ⚠ Location: Singapore — you're in KL             │ │
│  └─────────────────────────────────────────────────────┘ │
│  [Register]                                              │
│                                                          │
│  ✦ APAC Innovation Challenge               76% fit      │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Why this matches:                                   │ │
│  │ • Fintech focus aligns with your interests          │ │
│  │ • ⚠ Requires intermediate experience — may be      │ │
│  │   challenging at your current level                 │ │
│  │ • Past beginners who joined had 60% completion rate │ │
│  └─────────────────────────────────────────────────────┘ │
│  [Register]                                              │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**How the summary is generated:**

```python
# Per-match reasoning already exists from matching step
# One extra Gemini call generates the top-level summary:

summary_prompt = f"""
Given this participant profile: {participant_profile}
And these recommended programmes with scores: {recommendations}
And these historical outcomes for similar participants: {past_outcomes}

Write a 3-sentence personalised summary explaining:
1. Why these programmes were recommended
2. What similar participants achieved
3. Which match is strongest and why
"""

summary = gemini.generate_content(summary_prompt)
# Stored in Firestore under participant doc, displayed on dashboard
```

**Step 4: Participant Registers for Programme**
- Clicks "Register" → interest request saved to Firestore
- Admin reviews and approves (or auto-approved based on programme rules)

**Step 5: Within a Programme**
- System recommends mentors within that programme
- Participant can view assigned mentor, engagement history

**Step 6: Post-Programme Outcomes**
- Participant logs outcomes: skills gained, projects built, jobs landed, connections made
- Data feeds back into learning loop

### Admin Flow

**Step 1: Admin Logs In**
- Sees dashboard: Programmes | Participants | Matches | Analytics

**Step 2: Admin Creates Programmes**
- Creates programme with: name, type (hackathon/bootcamp/accelerator), focus areas, difficulty level, dates, location, capacity

**Step 3: Admin Uploads Mentors/Companies**
- Fills form or uploads JSON/CSV with profiles
- Data saved to Firestore with auto-generated embeddings

**Step 4: Admin Triggers Matching**
- Clicks "Run Matching" → agent scores all entity pairs → takes 1-3 minutes
- Can run for specific programme ("Match participants to AI Hackathon mentors")

**Step 5: Admin Reviews Matches**
- Results table: Entity A | Entity B | Score | Reasoning | [Assign] [Reject]
- Can review participant-programme registrations
- Can review mentor-company matches

**Step 6: Admin Approves/Rejects**
- Approves good matches → status "assigned"
- Rejects poor fits → status "rejected"

**Step 7: Admin Tracks Outcomes**
- Logs programme-level outcomes
- Views participant outcome submissions

**Step 8: Admin Runs Analytics**
- Agent analyses all relationships + outcomes
- Returns insights: "Participants with Python skills had 85% completion rate in AI hackathons. Beginners paired with experienced mentors had 2x better outcomes."

**Step 9: Next Cohort — System Improves**
- New participants sign up → agent uses past data to recommend better
- Matching quality improves with each cohort

### Mentor Flow

**Step 1: Mentor Signs Up / Is Uploaded**
- Profile: expertise, years, availability, interests

**Step 2: Mentor Sees Assignments**
- Dashboard shows assigned participants and companies
- Can view match reasoning ("You were matched because of your fintech expertise")

**Step 3: Mentor Logs Engagement**
- Hours mentored, meetings held, feedback on participants

---

## Database Schema (Firestore)

```
firestore/
├── participants/
│   └── part_001
│       ├── name: "Sarah Tan"
│       ├── type: "student" / "worker" / "freelancer"
│       ├── skills: ["python", "data analysis", "UI design"]
│       ├── interests: ["AI", "fintech", "sustainability"]
│       ├── experience_level: "beginner" / "intermediate" / "advanced"
│       ├── goals: ["learn startup building", "find co-founder"]
│       ├── location: "Kuala Lumpur"
│       ├── embedding: Vector([...])
│       └── created_at: timestamp
│
├── mentors/
│   └── m_001
│       ├── name: "John Doe"
│       ├── expertise: ["AI", "SaaS"]
│       ├── years: 10
│       ├── availability: "Q1-Q2 2026"
│       ├── embedding: Vector([...])
│       └── created_at: timestamp
│
├── companies/
│   └── c_001
│       ├── name: "StartupX"
│       ├── sector: "fintech"
│       ├── stage: "seed"
│       ├── needs: ["regulatory", "fundraising"]
│       ├── embedding: Vector([...])
│       └── created_at: timestamp
│
├── programmes/
│   └── p_001
│       ├── name: "AI Fintech Hackathon 2026"
│       ├── type: "hackathon" / "bootcamp" / "accelerator"
│       ├── focus: ["AI", "fintech"]
│       ├── difficulty: "beginner" / "intermediate" / "advanced"
│       ├── location: "Kuala Lumpur"
│       ├── dates: { start: "2026-06-01", end: "2026-06-02" }
│       ├── capacity: 50
│       ├── embedding: Vector([...])
│       └── created_at: timestamp
│
├── relationships/
│   └── rel_001
│       ├── type: "participant_programme" / "mentor_company" /
│       │         "participant_mentor" / "company_programme" /
│       │         "partner_programme"
│       ├── from_entity: { id: "part_001", type: "participant" }
│       ├── to_entity: { id: "p_001", type: "programme" }
│       ├── match_score: 0.94
│       ├── reasoning: "AI + fintech interest matches hackathon focus,
│       │               beginner-friendly difficulty level fits"
│       ├── fit_factors: ["interest_alignment", "difficulty_fit",
│       │                 "location_match"]
│       ├── status: "recommended" / "registered" / "approved" /
│       │           "assigned" / "completed" / "rejected"
│       ├── created_at: timestamp
│       ├── engagement:
│       │   ├── hours: 15
│       │   ├── meetings: 4
│       │   └── last_interaction: timestamp
│       └── outcomes:
│           ├── [{ type: "skills_gained", details: ["React", "API design"] }]
│           ├── [{ type: "project_completed", details: "Built matching MVP" }]
│           └── [{ type: "job_landed", details: "Junior dev at StartupX" }]
│
├── interest_requests/
│   └── req_001
│       ├── from_entity: { id: "part_001", type: "participant" }
│       ├── to_entity: { id: "p_001", type: "programme" }
│       ├── type: "participant_to_programme"
│       ├── status: "pending" / "approved" / "rejected"
│       └── created_at: timestamp
│
├── partners/
│   └── partner_001
│       ├── name: "Legal Firm X"
│       ├── type: "service_provider"
│       ├── services: ["regulatory", "IP"]
│       ├── embedding: Vector([...])
│       └── created_at: timestamp
│
└── users/
    └── user_001
        ├── role: "participant" / "mentor" / "company" / "partner" / "admin"
        ├── entity_id: "part_001" (links to relevant collection)
        ├── email: "sarah@email.com"
        └── created_at: timestamp
```

---

## Implementation Plan (24 Hours)

### Tech Stack

| Component | Tool |
|-----------|------|
| Frontend | React (Firebase Hosting or Vercel) |
| Backend | Python Flask (Cloud Run) |
| Auth | Firebase Authentication (role-based) |
| AI | Gemini Enterprise Agent Platform (ADK + Gemini API) |
| Vector Search | Agent Platform Vector Search or Firestore vector search |
| Database | Firestore |

### Timeline

| Phase | Task | Time |
|-------|------|------|
| Setup | Google Cloud project, enable APIs, Firebase setup | 30 min |
| Auth | Firebase Auth + role-based access (admin/participant/mentor) | 1 hour |
| Vector Search | Generate embeddings, create index, deploy endpoint | 1-2 hours |
| Backend — Core | Cloud Run app + participant, admin, matching endpoints | 3 hours |
| Agent | Define tools, create matching + recommendation agent with ADK | 1.5 hours |
| Frontend — Participant | Sign up, profile form, recommendation dashboard with AI summary + per-match reasoning, register | 3 hours |
| Frontend — Admin | Programme creation, match review, approve/reject, analytics | 2 hours |
| Frontend — Mentor | View assignments, log engagement | 1 hour |
| Integration | Connect frontend ↔ backend ↔ Agent Platform | 1 hour |
| Testing | End-to-end flow, edge cases | 1 hour |
| Demo prep | Polish, prepare presentation | 2 hours |
| Buffer | Unexpected issues | ~7.5 hours |

### Build Priority (If Running Low on Time)

1. **Must have:** Participant sign-up → programme recommendations → register
2. **Must have:** Admin creates programmes → triggers matching → reviews
3. **Should have:** Mentor-company matching with scoring
4. **Nice to have:** Mentor view, outcome tracking, analytics
5. **Nice to have:** Partner recommendations

### Success Criteria for Demo

- ✅ Participant signs up with profile (skills, interests, goals)
- ✅ System generates personalised AI summary explaining match rationale
- ✅ System recommends relevant programmes/hackathons with per-match reasoning and warning flags
- ✅ Participant registers for a programme
- ✅ Admin creates programmes and uploads mentors/companies
- ✅ Admin triggers matching → scores all pairs using Gemini Agent
- ✅ Vector Search filters candidates before deep scoring
- ✅ Display ranked matches with reasoning
- ✅ Assign relationships → status updates
- ✅ Log outcomes → stored in Firestore
- ✅ Analytics → "Which participant profiles succeed in which programmes?"
- ✅ Next cohort recommendations improve from past outcome data

### What NOT to Do in 24 Hours

- ❌ Build complex ML models (use pre-built Gemini)
- ❌ Over-engineer frontend (functional > pretty)
- ❌ Complex role permissions beyond basic role check
- ❌ BigQuery (overkill unless you have historical data)
- ❌ Try to build all matching directions — focus on participant → programme first

---

## Key Insight

You're not building a complex ML model. You're building an **orchestration layer** where:

- Participants self-serve and receive AI-powered programme recommendations
- A Gemini Agent autonomously manages matching across all entity types
- Vector Search efficiently narrows candidates
- Gemini does the reasoning (score, explain, recommend)
- Past outcomes inform future matches
- Admins govern the process, not drive every decision
- The platform demonstrates how automation replaces manual coordination as ecosystems scale
