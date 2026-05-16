"""
Hybrid matching agent for EcoLink.

Pipeline:
  1. Fetch entity profiles from Firestore
  2. Vector search → top-N nearest candidates (fast, cheap)
  3. Gemini scoring → score each candidate pair (smart, explainable)
  4. Store high-scoring matches as relationships in Firestore
  5. Use past outcome data to add context for Gemini scoring

Match types supported:
  - participant → programme  (primary)
  - participant → mentor     (within a programme)
  - mentor → company
  - company → programme
"""
from datetime import datetime, timezone

from . import firestore_client as fs
from . import gemini_client as gemini

MATCH_SCORE_THRESHOLD = 0.60  # Only store matches above this score


def _structured_filter(entity: dict, candidates: list, candidate_type: str) -> list:
    """
    Pre-filter candidates using structured fields before vector search.
    Returns candidates that pass at least one structural match.
    Falls back to all candidates if none pass (so matching never returns empty).
    """
    entity_skills = set(s.lower() for s in entity.get("skills", []) + entity.get("expertise", []))
    entity_interests = set(s.lower() for s in entity.get("interests", []))
    entity_location = (entity.get("location") or "").lower()
    entity_level = entity.get("experience_level", "")

    filtered = []
    for c in candidates:
        if candidate_type == "programme":
            c_skills = set(s.lower() for s in c.get("required_skills", c.get("focus", [])))
            c_focus = set(s.lower() for s in c.get("focus", []))
            c_location = (c.get("location") or "").lower()
            c_difficulty = c.get("difficulty", "")
            if (entity_skills & c_skills
                or entity_interests & c_focus
                or (entity_location and entity_location == c_location)
                or entity_level == c_difficulty):
                filtered.append(c)
        elif candidate_type == "mentor":
            c_expertise = set(s.lower() for s in c.get("expertise", []))
            if entity_skills & c_expertise or entity_interests & c_expertise:
                filtered.append(c)
        elif candidate_type == "participant":
            c_skills = set(s.lower() for s in c.get("skills", []))
            c_interests = set(s.lower() for s in c.get("interests", []))
            mentor_expertise = set(s.lower() for s in entity.get("expertise", []))
            if mentor_expertise & c_skills or mentor_expertise & c_interests:
                filtered.append(c)

    return filtered if filtered else candidates  # fallback: no filter applied


def _profile_to_text(entity: dict, entity_type: str) -> str:
    """Convert a structured profile dict to a plain-text description for embedding."""
    if entity_type == "participant":
        return (
            f"Participant: {entity.get('name', '')}. "
            f"Type: {entity.get('type', '')}. "
            f"Skills: {', '.join(entity.get('skills', []))}. "
            f"Interests: {', '.join(entity.get('interests', []))}. "
            f"Experience: {entity.get('experience_level', '')}. "
            f"Goals: {', '.join(entity.get('goals', []))}. "
            f"Location: {entity.get('location', '')}."
        )
    elif entity_type == "programme":
        return (
            f"Programme: {entity.get('name', '')}. "
            f"Type: {entity.get('type', '')}. "
            f"Focus: {', '.join(entity.get('focus', []))}. "
            f"Difficulty: {entity.get('difficulty', '')}. "
            f"Location: {entity.get('location', '')}."
        )
    elif entity_type == "mentor":
        return (
            f"Mentor: {entity.get('name', '')}. "
            f"Expertise: {', '.join(entity.get('expertise', []))}. "
            f"Years: {entity.get('years', '')}. "
            f"Availability: {entity.get('availability', '')}."
        )
    elif entity_type == "company":
        return (
            f"Company: {entity.get('name', '')}. "
            f"Sector: {entity.get('sector', '')}. "
            f"Stage: {entity.get('stage', '')}. "
            f"Needs: {', '.join(entity.get('needs', []))}."
        )
    return str(entity)


def generate_and_store_embedding(entity_id: str, entity_type: str, entity: dict):
    """Generate embedding for an entity and store it back in Firestore."""
    text = _profile_to_text(entity, entity_type)
    embedding = gemini.generate_embedding(text)
    collection = f"{entity_type}s" if entity_type != "company" else "companies"
    import firebase_admin
    from firebase_admin import firestore as fs_admin
    db = fs_admin.client()
    from google.cloud.firestore_v1.vector import Vector
    db.collection(collection).document(entity_id).update({"embedding": Vector(embedding)})
    return embedding


def run_participant_programme_matching(programme_id: str = None) -> list[dict]:
    """
    Match all participants to programmes (or a specific programme).
    Returns list of created relationship dicts.

    Steps:
      1. For each participant, find top-10 nearest programmes via vector search
      2. Gemini scores each pair
      3. Stores relationships with score >= threshold
    """
    participants = fs._get_all_participants_with_embeddings()
    past_outcomes = fs.get_completed_relationships()
    created = []

    for participant in participants:
        participant_id = participant["id"]

        # Skip if no embedding yet
        if "embedding" not in participant:
            continue

        embedding = list(participant["embedding"])
        candidate_programmes = fs.find_nearest_programmes(embedding, top_k=10)

        # Filter to specific programme if requested
        if programme_id:
            candidate_programmes = [p for p in candidate_programmes if p["id"] == programme_id]

        for programme in candidate_programmes:
            # Skip if already has a relationship
            existing = fs.get_relationships({
                "from_entity.id": participant_id,
                "to_entity.id": programme["id"],
            })
            if existing:
                continue

            # Gemini deep scoring
            result = gemini.score_match(
                participant, programme,
                ("participant", "programme"),
                past_outcomes=past_outcomes,
            )

            if result["score"] >= MATCH_SCORE_THRESHOLD:
                rel = {
                    "type": "participant_programme",
                    "from_entity": {"id": participant_id, "type": "participant"},
                    "to_entity": {"id": programme["id"], "type": "programme"},
                    "match_score": result["score"],
                    "reasoning": result["reasoning"],
                    "fit_factors": result["fit_factors"],
                    "warnings": result.get("warnings", []),
                    "status": "recommended",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "engagement": {"hours": 0, "meetings": 0},
                    "outcomes": [],
                }
                rel_id = fs.create_relationship(rel)
                created.append({"id": rel_id, **rel})

    return created


def run_mentor_company_matching(programme_id: str = None) -> list[dict]:
    """
    Match mentors to companies.
    """
    mentors = fs._get_all_mentors_with_embeddings()
    companies = fs._get_all_companies_with_embeddings()
    past_outcomes = fs.get_completed_relationships()
    created = []

    for company in companies:
        company_id = company["id"]
        if "embedding" not in company:
            continue

        embedding = list(company["embedding"])
        candidate_mentors = fs.find_nearest_mentors(embedding, top_k=5)

        for mentor in candidate_mentors:
            existing = fs.get_relationships({
                "from_entity.id": mentor["id"],
                "to_entity.id": company_id,
            })
            if existing:
                continue

            result = gemini.score_match(
                mentor, company,
                ("mentor", "company"),
                past_outcomes=past_outcomes,
            )

            if result["score"] >= MATCH_SCORE_THRESHOLD:
                rel = {
                    "type": "mentor_company",
                    "from_entity": {"id": mentor["id"], "type": "mentor"},
                    "to_entity": {"id": company_id, "type": "company"},
                    "match_score": result["score"],
                    "reasoning": result["reasoning"],
                    "fit_factors": result["fit_factors"],
                    "warnings": result.get("warnings", []),
                    "status": "recommended",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "engagement": {"hours": 0, "meetings": 0},
                    "outcomes": [],
                }
                rel_id = fs.create_relationship(rel)
                created.append({"id": rel_id, **rel})

    return created


def run_participant_mentor_matching(participant_id: str = None) -> list[dict]:
    """
    Match all participants to mentors (or a specific participant).
    Stage 1: Structured pre-filter (skills/interests overlap)
    Stage 2: Vector search on filtered candidates
    Stage 3: Groq scoring on top-3 shortlist
    """
    participants = fs._get_all_participants_with_embeddings()
    past_outcomes = fs.get_completed_relationships()
    created = []

    for participant in participants:
        p_id = participant["id"]

        # Filter to specific participant if requested
        if participant_id and p_id != participant_id:
            continue

        # Skip if no embedding
        if "embedding" not in participant:
            continue

        embedding = list(participant["embedding"])
        all_mentors = fs._get_all_mentors_with_embeddings()

        # Stage 1: Structured pre-filter
        filtered_mentors = _structured_filter(participant, all_mentors, "mentor")

        # Stage 2: Vector search on filtered set
        if filtered_mentors:
            candidate_mentors = fs.find_nearest_mentors(embedding, top_k=5)
            candidate_mentors = [m for m in candidate_mentors if m["id"] in [fm["id"] for fm in filtered_mentors]]
        else:
            candidate_mentors = []

        # Stage 3: Score top-3 only
        for mentor in candidate_mentors[:3]:
            # Skip if already has a relationship
            existing = fs.get_relationships({
                "from_entity.id": p_id,
                "to_entity.id": mentor["id"],
            })
            if existing:
                continue

            try:
                result = gemini.score_match(
                    participant, mentor,
                    ("participant", "mentor"),
                    past_outcomes=past_outcomes,
                )

                if result["score"] >= MATCH_SCORE_THRESHOLD:
                    rel = {
                        "type": "participant_mentor",
                        "from_entity": {"id": p_id, "type": "participant"},
                        "to_entity": {"id": mentor["id"], "type": "mentor"},
                        "match_score": result["score"],
                        "reasoning": result["reasoning"],
                        "fit_factors": result["fit_factors"],
                        "warnings": result.get("warnings", []),
                        "status": "recommended",
                        "created_at": datetime.now(timezone.utc).isoformat(),
                        "engagement": {"hours": 0, "meetings": 0},
                        "outcomes": [],
                    }
                    rel_id = fs.create_relationship(rel)
                    created.append({"id": rel_id, **rel})
            except Exception as e:
                print(f"Warning: scoring failed for participant {p_id} -> mentor {mentor['id']}: {e}")

    return created


def run_mentor_participant_matching(mentor_id: str, mentor: dict, embedding: list) -> list[dict]:
    """
    Match a mentor to participants at signup.
    Called inline when a mentor registers.
    Returns list of created participant_mentor relationships (from_entity=participant).
    """
    all_participants = fs._get_all_participants_with_embeddings()
    past_outcomes = fs.get_completed_relationships()
    created = []

    # Stage 1: Structured pre-filter
    filtered_participants = _structured_filter(mentor, all_participants, "participant")

    # Stage 2: Vector search on filtered set
    candidate_participants = fs.find_nearest_participants(embedding, top_k=10)
    candidate_participants = [p for p in candidate_participants if p["id"] in [fp["id"] for fp in filtered_participants]]

    # Stage 3: Score top-5 only
    for participant in candidate_participants[:5]:
        # Skip if already has a relationship
        existing = fs.get_relationships({
            "from_entity.id": participant["id"],
            "to_entity.id": mentor_id,
        })
        if existing:
            continue

        try:
            result = gemini.score_match(
                participant, mentor,
                ("participant", "mentor"),
                past_outcomes=past_outcomes,
            )

            if result["score"] >= MATCH_SCORE_THRESHOLD:
                rel = {
                    "type": "participant_mentor",
                    "from_entity": {"id": participant["id"], "type": "participant"},
                    "to_entity": {"id": mentor_id, "type": "mentor"},
                    "match_score": result["score"],
                    "reasoning": result["reasoning"],
                    "fit_factors": result["fit_factors"],
                    "warnings": result.get("warnings", []),
                    "status": "recommended",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "engagement": {"hours": 0, "meetings": 0},
                    "outcomes": [],
                }
                rel_id = fs.create_relationship(rel)
                created.append({"id": rel_id, **rel})
        except Exception as e:
            print(f"Warning: scoring failed for mentor {mentor_id} -> participant {participant['id']}: {e}")

    return created


def get_recommendations_for_mentor(mentor_id: str) -> dict:
    """
    Fetch existing recommended/assigned relationships where mentor is the 'to_entity'.
    Returns participant matches for the mentor.
    """
    mentor = fs.get_mentor(mentor_id)
    if not mentor:
        return {"recommendations": []}

    relationships = fs.get_relationships({"to_entity.id": mentor_id})
    recommendations = []

    for rel in relationships:
        if rel.get("type") == "participant_mentor" and rel.get("status") in ("recommended", "assigned"):
            participant = fs.get_participant(rel["from_entity"]["id"])
            if participant:
                recommendations.append({**rel, "participant": participant})

    # Sort by score descending
    recommendations.sort(key=lambda r: r.get("match_score", 0), reverse=True)

    return {"recommendations": recommendations}


def get_recommendations_for_participant(participant_id: str) -> dict:
    """
    Fetch existing recommended relationships for a participant (both programme and mentor),
    then generate a personalised AI summary.

    Returns:
        {
          "summary": str,
          "recommendations": [programme relationships with programme details],
          "mentor_recommendations": [mentor relationships with mentor details]
        }
    """
    participant = fs.get_participant(participant_id)
    if not participant:
        return {"summary": "", "recommendations": [], "mentor_recommendations": []}

    relationships = fs.get_relationships({"from_entity.id": participant_id})
    programme_recommendations = []
    mentor_recommendations = []

    for rel in relationships:
        if rel.get("status") == "recommended":
            if rel.get("type") == "participant_programme":
                programme = fs.get_programme(rel["to_entity"]["id"])
                if programme:
                    programme_recommendations.append({**rel, "programme": programme})
            elif rel.get("type") == "participant_mentor":
                mentor = fs.get_mentor(rel["to_entity"]["id"])
                if mentor:
                    mentor_recommendations.append({**rel, "mentor": mentor})

    # Sort by score descending
    programme_recommendations.sort(key=lambda r: r.get("match_score", 0), reverse=True)
    mentor_recommendations.sort(key=lambda r: r.get("match_score", 0), reverse=True)

    # Generate AI summary (or use cached one)
    if participant.get("ai_summary"):
        summary = participant["ai_summary"]
    else:
        past_outcomes = fs.get_completed_relationships()
        summary = gemini.generate_summary(participant, programme_recommendations[:3], past_outcomes)
        # Cache summary on participant doc
        fs.update_participant(participant_id, {"ai_summary": summary})

    return {"summary": summary, "recommendations": programme_recommendations, "mentor_recommendations": mentor_recommendations}


def _cosine_similarity(a: list, b: list) -> float:
    """Cosine similarity between two equal-length vectors."""
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = sum(x * x for x in a) ** 0.5
    nb = sum(y * y for y in b) ** 0.5
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


def _structured_signals(entity: dict, candidate: dict, candidate_type: str) -> dict:
    """
    Compute the per-signal pre-filter breakdown between two entities.
    Returns which signals matched and the overlapping values for each.
    """
    e_skills = set(s.lower() for s in entity.get("skills", []) + entity.get("expertise", []))
    e_interests = set(s.lower() for s in entity.get("interests", []))
    e_location = (entity.get("location") or "").lower()
    e_level = entity.get("experience_level", "")

    signals = []

    if candidate_type == "programme":
        c_skills = set(s.lower() for s in candidate.get("required_skills", candidate.get("focus", [])))
        c_focus = set(s.lower() for s in candidate.get("focus", []))
        c_location = (candidate.get("location") or "").lower()
        c_difficulty = candidate.get("difficulty", "")

        skill_overlap = sorted(e_skills & c_skills)
        signals.append({
            "name": "Skills ↔ Required Skills",
            "matched": bool(skill_overlap),
            "overlap": skill_overlap,
            "detail": f"{len(skill_overlap)} of your skills match this programme's needs" if skill_overlap else "No direct skill overlap",
        })

        interest_overlap = sorted(e_interests & c_focus)
        signals.append({
            "name": "Interests ↔ Programme Focus",
            "matched": bool(interest_overlap),
            "overlap": interest_overlap,
            "detail": f"{len(interest_overlap)} interest(s) align with programme focus" if interest_overlap else "No interest overlap with programme focus",
        })

        loc_match = bool(e_location and e_location == c_location)
        signals.append({
            "name": "Location",
            "matched": loc_match,
            "overlap": [e_location] if loc_match else [],
            "detail": f"Both in {entity.get('location')}" if loc_match else f"You: {entity.get('location') or '—'} · Programme: {candidate.get('location') or '—'}",
        })

        level_match = bool(e_level and e_level == c_difficulty)
        signals.append({
            "name": "Experience Level ↔ Difficulty",
            "matched": level_match,
            "overlap": [e_level] if level_match else [],
            "detail": f"Both {e_level}" if level_match else f"You: {e_level or '—'} · Programme: {c_difficulty or '—'}",
        })

    elif candidate_type == "mentor":
        c_expertise = set(s.lower() for s in candidate.get("expertise", []))

        skill_overlap = sorted(e_skills & c_expertise)
        signals.append({
            "name": "Skills ↔ Mentor Expertise",
            "matched": bool(skill_overlap),
            "overlap": skill_overlap,
            "detail": f"{len(skill_overlap)} skill(s) match mentor expertise" if skill_overlap else "No direct skill overlap with mentor",
        })

        interest_overlap = sorted(e_interests & c_expertise)
        signals.append({
            "name": "Interests ↔ Mentor Expertise",
            "matched": bool(interest_overlap),
            "overlap": interest_overlap,
            "detail": f"{len(interest_overlap)} interest(s) align with mentor's expertise" if interest_overlap else "No interest overlap with mentor expertise",
        })

    return {
        "signals": signals,
        "passed": sum(1 for s in signals if s["matched"]),
        "total": len(signals),
    }


def explain_match(relationship_id: str) -> dict:
    """
    Reconstruct the 3-stage matching pipeline for a single relationship.
    Returns: from_entity, to_entity, pre_filter signals, vector similarity,
    and the stored Groq reasoning + score.
    """
    rel = fs.get_relationship(relationship_id)
    if not rel:
        return {"error": "Relationship not found"}

    from_info = rel.get("from_entity", {})
    to_info = rel.get("to_entity", {})

    # Fetch entities WITH embeddings (so we can recompute vector similarity)
    from_type = from_info.get("type")
    to_type = to_info.get("type")

    from_entity = None
    to_entity = None
    if from_type == "participant":
        from_entity = fs._get_participant_with_embedding(from_info["id"])
    if to_type == "programme":
        # Use raw stream to keep embedding
        from firebase_admin import firestore as fs_admin
        doc = fs_admin.client().collection("programmes").document(to_info["id"]).get()
        to_entity = {"id": doc.id, **doc.to_dict()} if doc.exists else None
    elif to_type == "mentor":
        from firebase_admin import firestore as fs_admin
        doc = fs_admin.client().collection("mentors").document(to_info["id"]).get()
        to_entity = {"id": doc.id, **doc.to_dict()} if doc.exists else None

    if not from_entity or not to_entity:
        return {"error": "Could not load entities"}

    # Stage 1: structured signals
    pre_filter = _structured_signals(from_entity, to_entity, to_type)

    # Stage 2: vector similarity
    from_emb = list(from_entity.get("embedding") or [])
    to_emb = list(to_entity.get("embedding") or [])
    vector_similarity = _cosine_similarity(from_emb, to_emb)

    # Strip embeddings before returning
    from_clean = {k: v for k, v in from_entity.items() if k != "embedding"}
    to_clean = {k: v for k, v in to_entity.items() if k != "embedding"}

    return {
        "relationship_id": relationship_id,
        "from_entity": from_clean,
        "to_entity": to_clean,
        "to_type": to_type,
        "pipeline": {
            "stage_1_pre_filter": pre_filter,
            "stage_2_vector_similarity": {
                "score": round(vector_similarity, 4),
                "score_percent": round(vector_similarity * 100, 1),
                "method": "Cosine similarity on 768-dim Gemini embeddings",
            },
            "stage_3_llm_scoring": {
                "score": rel.get("match_score"),
                "score_percent": round((rel.get("match_score") or 0) * 100, 1),
                "reasoning": rel.get("reasoning"),
                "fit_factors": rel.get("fit_factors", []),
                "warnings": rel.get("warnings", []),
                "model": "Groq llama-3.3-70b-versatile",
            },
        },
    }
