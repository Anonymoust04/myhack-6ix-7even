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
