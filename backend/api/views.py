"""
DRF API views for EcoLink.

Participant endpoints:
  POST /api/register-participant
  PUT  /api/update-profile/<id>
  GET  /api/recommendations/<participant_id>
  POST /api/register-programme
  GET  /api/my-programmes/<participant_id>
  POST /api/participant-outcome

Admin endpoints:
  POST /api/create-programme
  POST /api/upload-mentors
  POST /api/upload-companies
  POST /api/run-matching
  GET  /api/matches
  POST /api/assign
  POST /api/approve-registration
  GET  /api/analytics

Shared:
  GET  /api/relationship/<id>
  POST /api/outcomes
"""
from datetime import datetime, timezone

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from . import firestore_client as fs
from . import gemini_client as gemini
from . import matching_agent as agent
from .serializers import (
    ParticipantSerializer, ProgrammeSerializer, MentorSerializer,
    CompanySerializer, OutcomeSerializer, AssignSerializer,
)


# ──────────────────────────────────────────────
# PARTICIPANT ENDPOINTS
# ──────────────────────────────────────────────

@api_view(["POST"])
def register_participant(request):
    """
    Register a new participant.
    Generates embedding, stores profile, and runs immediate matching.
    """
    serializer = ParticipantSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    data["created_at"] = datetime.now(timezone.utc).isoformat()

    # Save to Firestore first (get ID)
    participant_id = fs.create_participant(data)

    # Generate and store embedding
    embedding = None
    try:
        embedding = agent.generate_and_store_embedding(participant_id, "participant", data)
    except Exception as e:
        # Non-fatal: matching will be empty if embedding fails
        print(f"Warning: embedding generation failed for {participant_id}: {e}")

    # Run inline matching (structured pre-filter + vector search + Groq scoring)
    programme_matches = []
    mentor_matches = []
    if embedding:
        try:
            # Stage 1: Find nearest programmes
            all_programmes = fs._get_all_programmes_with_embeddings()
            filtered_programmes = agent._structured_filter(data, all_programmes, "programme")
            candidate_programmes = fs.find_nearest_programmes(embedding, top_k=10)
            candidate_programmes = [p for p in candidate_programmes if p["id"] in [fp["id"] for fp in filtered_programmes]]

            # Stage 2: Score top-5 programmes
            past_outcomes = fs.get_completed_relationships()
            for programme in candidate_programmes[:5]:
                try:
                    result = gemini.score_match(data, programme, ("participant", "programme"), past_outcomes=past_outcomes)
                    if result["score"] >= agent.MATCH_SCORE_THRESHOLD:
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
                        programme_matches.append({"id": rel_id, **rel, "programme": programme})
                except Exception as e:
                    print(f"Warning: programme scoring failed: {e}")

            # Stage 3: Find nearest mentors
            all_mentors = fs._get_all_mentors_with_embeddings()
            filtered_mentors = agent._structured_filter(data, all_mentors, "mentor")
            candidate_mentors = fs.find_nearest_mentors(embedding, top_k=10)
            candidate_mentors = [m for m in candidate_mentors if m["id"] in [fm["id"] for fm in filtered_mentors]]

            # Stage 4: Score top-3 mentors
            for mentor in candidate_mentors[:3]:
                try:
                    result = gemini.score_match(data, mentor, ("participant", "mentor"), past_outcomes=past_outcomes)
                    if result["score"] >= agent.MATCH_SCORE_THRESHOLD:
                        rel = {
                            "type": "participant_mentor",
                            "from_entity": {"id": participant_id, "type": "participant"},
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
                        mentor_matches.append({"id": rel_id, **rel, "mentor": mentor})
                except Exception as e:
                    print(f"Warning: mentor scoring failed: {e}")
        except Exception as e:
            print(f"Warning: inline matching failed: {e}")

    return Response({
        "id": participant_id,
        "message": "Participant registered",
        "programme_matches": programme_matches,
        "mentor_matches": mentor_matches,
    }, status=status.HTTP_201_CREATED)


@api_view(["GET"])
def get_recommendations(request, participant_id):
    """
    Get AI-matched programme + mentor recommendations for a participant.
    Returns personalised summary + ranked programme/mentor list with reasoning.
    """
    result = agent.get_recommendations_for_participant(participant_id)
    if not result["recommendations"] and not result["mentor_recommendations"] and not result["summary"]:
        return Response({"error": "Participant not found"}, status=status.HTTP_404_NOT_FOUND)
    return Response(result)


@api_view(["POST"])
def request_mentor(request):
    """
    Participant requests to connect with a mentor.
    If a recommended relationship exists, flip to "requested".
    Otherwise create a new participant_mentor relationship with status "requested".
    """
    participant_id = request.data.get("participant_id")
    mentor_id = request.data.get("mentor_id")
    if not participant_id or not mentor_id:
        return Response({"error": "participant_id and mentor_id required"}, status=status.HTTP_400_BAD_REQUEST)

    existing = fs.get_relationships({
        "from_entity.id": participant_id,
        "to_entity.id": mentor_id,
    })

    # Block re-requests when already requested/accepted
    for rel in existing:
        if rel.get("status") in ("requested", "accepted"):
            return Response({"error": f"Already {rel['status']}"}, status=status.HTTP_400_BAD_REQUEST)

    # Promote a recommended relationship in place
    for rel in existing:
        if rel.get("status") == "recommended":
            fs.update_relationship_status(rel["id"], "requested")
            return Response({"id": rel["id"], "message": "Mentor request sent!"}, status=status.HTTP_200_OK)

    # Otherwise create fresh
    rel_data = {
        "type": "participant_mentor",
        "from_entity": {"id": participant_id, "type": "participant"},
        "to_entity": {"id": mentor_id, "type": "mentor"},
        "status": "requested",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "engagement": {"hours": 0, "meetings": 0},
        "outcomes": [],
        "messages": [],
        "match_score": 0.0,
        "reasoning": "Participant directly requested this mentor",
        "fit_factors": [],
        "warnings": [],
    }
    rel_id = fs.create_relationship(rel_data)
    return Response({"id": rel_id, "message": "Mentor request sent!"}, status=status.HTTP_201_CREATED)


@api_view(["POST"])
def respond_to_request(request):
    """
    Mentor accepts or declines a participant connection request.
    Body: {relationship_id, response: "accepted" | "declined"}
    """
    rel_id = request.data.get("relationship_id")
    response_status = request.data.get("response")
    if response_status not in ("accepted", "declined"):
        return Response({"error": "response must be 'accepted' or 'declined'"}, status=status.HTTP_400_BAD_REQUEST)
    if not rel_id:
        return Response({"error": "relationship_id required"}, status=status.HTTP_400_BAD_REQUEST)

    fs.update_relationship_status(rel_id, response_status)
    return Response({"message": f"Request {response_status}"})


@api_view(["POST"])
def send_message(request):
    """
    Append a message to a relationship's thread.
    Body: {relationship_id, sender: "participant" | "mentor", text}
    """
    rel_id = request.data.get("relationship_id")
    sender = request.data.get("sender")
    text = (request.data.get("text") or "").strip()
    if not rel_id or sender not in ("participant", "mentor") or not text:
        return Response({"error": "relationship_id, sender, and text required"}, status=status.HTTP_400_BAD_REQUEST)

    rel = fs.get_relationship(rel_id)
    if not rel:
        return Response({"error": "Relationship not found"}, status=status.HTTP_404_NOT_FOUND)
    if rel.get("status") != "accepted":
        return Response({"error": "Cannot message until request is accepted"}, status=status.HTTP_400_BAD_REQUEST)

    message = {
        "sender": sender,
        "text": text,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    fs.append_message(rel_id, message)
    return Response({"message": "Sent", "data": message})


@api_view(["POST"])
def submit_match_feedback(request):
    """
    Participant or mentor leaves a thumbs up/down on a match.
    Body: {relationship_id, sender: "participant" | "mentor", thumbs: "up" | "down", note?}
    Stored on relationship.feedback array.
    """
    rel_id = request.data.get("relationship_id")
    sender = request.data.get("sender")
    thumbs = request.data.get("thumbs")
    note = (request.data.get("note") or "").strip()
    if not rel_id or sender not in ("participant", "mentor") or thumbs not in ("up", "down"):
        return Response({"error": "relationship_id, sender, thumbs required"}, status=status.HTTP_400_BAD_REQUEST)

    fb = {
        "sender": sender,
        "thumbs": thumbs,
        "note": note,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    fs.append_feedback(rel_id, fb)
    return Response({"message": "Feedback saved", "data": fb})


@api_view(["POST"])
def register_programme(request):
    """
    Participant registers for a programme directly (no admin approval needed).
    Creates a participant_programme relationship with status "registered".
    """
    participant_id = request.data.get("participant_id")
    programme_id = request.data.get("programme_id")
    if not participant_id or not programme_id:
        return Response({"error": "participant_id and programme_id required"}, status=status.HTTP_400_BAD_REQUEST)

    # Check if already registered (only check for "registered" status, not "recommended")
    existing = fs.get_relationships({
        "from_entity.id": participant_id,
        "to_entity.id": programme_id,
    })
    if existing and any(rel.get("status") == "registered" for rel in existing):
        return Response({"error": "Already registered for this programme"}, status=status.HTTP_400_BAD_REQUEST)

    # If there's a recommended relationship, update it to registered
    # Otherwise create a new relationship
    if existing and any(rel.get("status") == "recommended" for rel in existing):
        # Update existing recommended relationship to registered
        rec_rel = next(rel for rel in existing if rel.get("status") == "recommended")
        fs.update_relationship_status(rec_rel["id"], "registered")
        return Response({"id": rec_rel["id"], "message": "Successfully registered for programme!"}, status=status.HTTP_201_CREATED)
    else:
        # Create new direct registration
        rel_data = {
            "type": "participant_programme",
            "from_entity": {"id": participant_id, "type": "participant"},
            "to_entity": {"id": programme_id, "type": "programme"},
            "status": "registered",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "engagement": {"hours": 0, "meetings": 0},
            "outcomes": [],
            "match_score": 0.0,
            "reasoning": "Participant self-registered",
            "fit_factors": [],
            "warnings": [],
        }
        rel_id = fs.create_relationship(rel_data)
        return Response({"id": rel_id, "message": "Successfully registered for programme!"}, status=status.HTTP_201_CREATED)


@api_view(["GET"])
def my_programmes(request, participant_id):
    """Get all programmes a participant is registered in or recommended for."""
    relationships = fs.get_relationships({"from_entity.id": participant_id})
    result = []
    for rel in relationships:
        programme = fs.get_programme(rel["to_entity"]["id"])
        if programme:
            result.append({**rel, "programme": programme})
    return Response(result)


# ──────────────────────────────────────────────
# ADMIN ENDPOINTS
# ──────────────────────────────────────────────

@api_view(["POST"])
def create_programme(request):
    """Create a new programme and generate its embedding."""
    serializer = ProgrammeSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    data["created_at"] = datetime.now(timezone.utc).isoformat()

    programme_id = fs.create_programme(data)

    try:
        agent.generate_and_store_embedding(programme_id, "programme", data)
    except Exception as e:
        print(f"Warning: embedding failed for programme {programme_id}: {e}")

    return Response({"id": programme_id, "message": "Programme created"}, status=status.HTTP_201_CREATED)


@api_view(["POST"])
def upload_mentors(request):
    """
    Batch upload mentor profiles.
    Expects a list of mentor objects under the 'mentors' key.
    Runs inline participant matching for each mentor.
    """
    mentors_data = request.data.get("mentors", [])
    if not mentors_data:
        return Response({"error": "'mentors' list required"}, status=status.HTTP_400_BAD_REQUEST)

    created_ids = []
    mentor_matches_list = []

    for mentor_data in mentors_data:
        serializer = MentorSerializer(data=mentor_data)
        if not serializer.is_valid():
            continue
        data = serializer.validated_data
        data["created_at"] = datetime.now(timezone.utc).isoformat()
        mentor_id = fs.create_mentor(data)

        embedding = None
        try:
            embedding = agent.generate_and_store_embedding(mentor_id, "mentor", data)
        except Exception as e:
            print(f"Warning: embedding failed for mentor {mentor_id}: {e}")

        # Run inline matching for this mentor
        try:
            if embedding:
                participant_matches = agent.run_mentor_participant_matching(mentor_id, data, embedding)
                mentor_matches_list.append({"mentor_id": mentor_id, "matches": participant_matches})
        except Exception as e:
            print(f"Warning: mentor matching failed for {mentor_id}: {e}")

        created_ids.append(mentor_id)

    return Response({
        "created": len(created_ids),
        "ids": created_ids,
        "mentor_matches": mentor_matches_list
    }, status=status.HTTP_201_CREATED)


@api_view(["POST"])
def upload_companies(request):
    """Batch upload company profiles."""
    companies_data = request.data.get("companies", [])
    if not companies_data:
        return Response({"error": "'companies' list required"}, status=status.HTTP_400_BAD_REQUEST)

    created_ids = []
    for company_data in companies_data:
        serializer = CompanySerializer(data=company_data)
        if not serializer.is_valid():
            continue
        data = serializer.validated_data
        data["created_at"] = datetime.now(timezone.utc).isoformat()
        company_id = fs.create_company(data)
        try:
            agent.generate_and_store_embedding(company_id, "company", data)
        except Exception as e:
            print(f"Warning: embedding failed for company {company_id}: {e}")
        created_ids.append(company_id)

    return Response({"created": len(created_ids), "ids": created_ids}, status=status.HTTP_201_CREATED)


@api_view(["POST"])
def run_matching(request):
    """
    Trigger the matching agent.
    Optional body: { "programme_id": "...", "type": "participant_programme" | "mentor_company" }
    """
    programme_id = request.data.get("programme_id")
    match_type = request.data.get("type", "participant_programme")

    try:
        if match_type == "mentor_company":
            created = agent.run_mentor_company_matching(programme_id)
        else:
            created = agent.run_participant_programme_matching(programme_id)
        return Response({"matched": len(created), "relationships": created})
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
def get_matches(request):
    """
    Fetch ranked match relationships with entity names included.
    Query params: status, type
    """
    filters = {}
    if request.query_params.get("status"):
        filters["status"] = request.query_params["status"]
    if request.query_params.get("type"):
        filters["type"] = request.query_params["type"]

    relationships = fs.get_relationships(filters or None)

    # Enrich with entity names
    for rel in relationships:
        from_entity = rel.get("from_entity", {})
        to_entity = rel.get("to_entity", {})

        if from_entity.get("id") and not from_entity.get("name"):
            entity = None
            if from_entity.get("type") == "participant":
                entity = fs.get_participant(from_entity["id"])
            elif from_entity.get("type") == "mentor":
                entity = fs.get_mentor(from_entity["id"])
            elif from_entity.get("type") == "company":
                entity = fs.get_company(from_entity["id"])
            if entity:
                from_entity["name"] = entity.get("name")

        if to_entity.get("id") and not to_entity.get("name"):
            entity = None
            if to_entity.get("type") == "programme":
                entity = fs.get_programme(to_entity["id"])
            elif to_entity.get("type") == "company":
                entity = fs.get_company(to_entity["id"])
            if entity:
                to_entity["name"] = entity.get("name")

    # Sort by match_score descending
    relationships.sort(key=lambda r: r.get("match_score", 0), reverse=True)
    return Response(relationships)


@api_view(["POST"])
def assign(request):
    """Update a relationship status (assign, reject, complete)."""
    serializer = AssignSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    fs.update_relationship_status(data["relationship_id"], data["status"])
    return Response({"message": f"Relationship updated to '{data['status']}'"})


@api_view(["POST"])
def approve_registration(request):
    """Approve or reject a participant programme registration request."""
    req_id = request.data.get("request_id")
    new_status = request.data.get("status")
    if not req_id or new_status not in ("approved", "rejected"):
        return Response({"error": "request_id and status (approved/rejected) required"}, status=status.HTTP_400_BAD_REQUEST)

    fs.update_interest_request_status(req_id, new_status)
    return Response({"message": f"Request {new_status}"})


@api_view(["GET"])
def get_pending_registrations(request):
    """Get all pending interest requests for admin review."""
    requests = fs.get_interest_requests({"status": "pending"})
    return Response(requests)


@api_view(["GET"])
def analytics(request):
    """Generate cohort analytics from all relationships."""
    all_rels = fs.get_relationships(None)
    if not all_rels:
        return Response({"insights": "No relationships yet. Run matching first!", "data_points": 0})

    # Segment by status
    recommended = [r for r in all_rels if r.get("status") == "recommended"]
    assigned = [r for r in all_rels if r.get("status") == "assigned"]
    completed = [r for r in all_rels if r.get("status") == "completed"]
    rejected = [r for r in all_rels if r.get("status") == "rejected"]

    # Score distribution
    scores = [r.get("match_score", 0) for r in all_rels if r.get("match_score")]
    avg_score = sum(scores) / len(scores) if scores else 0
    high_quality = sum(1 for s in scores if s >= 0.8)
    medium_quality = sum(1 for s in scores if 0.65 <= s < 0.8)
    low_quality = sum(1 for s in scores if s < 0.65)

    # Outcomes from completed relationships
    outcome_counts = {}
    for rel in completed:
        for outcome in rel.get("outcomes", []):
            outcome_type = outcome.get("type", "unknown")
            outcome_counts[outcome_type] = outcome_counts.get(outcome_type, 0) + 1

    # Warnings/flags
    warnings_count = sum(1 for r in all_rels if r.get("warnings"))

    # Build insights
    insights_list = []
    insights_list.append(f"📊 Matching Pipeline Overview")
    insights_list.append(f"  • Total matches generated: {len(all_rels)}")
    insights_list.append(f"  • Recommended: {len(recommended)} | Assigned: {len(assigned)} | Completed: {len(completed)} | Rejected: {len(rejected)}")

    insights_list.append(f"\n🎯 Match Quality Distribution")
    insights_list.append(f"  • Average score: {avg_score*100:.0f}%")
    insights_list.append(f"  • High quality (≥80%): {high_quality} matches")
    insights_list.append(f"  • Medium quality (65-79%): {medium_quality} matches")
    insights_list.append(f"  • Low quality (<65%): {low_quality} matches")

    if outcome_counts:
        insights_list.append(f"\n✅ Outcomes from Completed Relationships")
        for outcome_type, count in sorted(outcome_counts.items(), key=lambda x: x[1], reverse=True):
            insights_list.append(f"  • {outcome_type.replace('_', ' ')}: {count}")

    if warnings_count > 0:
        insights_list.append(f"\n⚠️  {warnings_count} matches flagged with warnings (e.g., location mismatch)")

    insights_list.append(f"\n💡 Recommendations")
    insights_list.append(f"  • Review and assign high-quality matches (≥80%)")
    insights_list.append(f"  • Monitor flagged matches for potential intervention")
    if len(recommended) > 0:
        insights_list.append(f"  • {len(recommended)} recommendations pending admin review")

    insights_text = "\n".join(insights_list)

    return Response({"insights": insights_text, "data_points": len(all_rels)})


# ──────────────────────────────────────────────
# SHARED ENDPOINTS
# ──────────────────────────────────────────────

@api_view(["GET"])
def get_relationship(request, rel_id):
    """Fetch a single relationship by ID."""
    rel = fs.get_relationship(rel_id)
    if not rel:
        return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)
    return Response(rel)


@api_view(["POST"])
def log_outcome(request):
    """Log an outcome for a relationship (skill gained, job landed, etc.)."""
    serializer = OutcomeSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    outcome = {
        "type": data["type"],
        "details": data["details"],
        "logged_at": datetime.now(timezone.utc).isoformat(),
    }
    fs.log_outcome(data["relationship_id"], outcome)
    return Response({"message": "Outcome logged"})


# ──────────────────────────────────────────────
# DATA ENDPOINTS (for frontend display)
# ──────────────────────────────────────────────

@api_view(["GET"])
def list_programmes(request):
    """List all programmes."""
    programmes = fs.get_all_programmes()
    return Response(programmes)


@api_view(["GET"])
def list_mentors(request):
    """List all mentors."""
    mentors = fs.get_all_mentors()
    return Response(mentors)


@api_view(["GET"])
def list_companies(request):
    """List all companies."""
    companies = fs.get_all_companies()
    return Response(companies)


@api_view(["GET"])
def list_participants(request):
    """List all participants (id + name only for login lookup)."""
    participants = fs.get_all_participants()
    return Response([{"id": p["id"], "name": p.get("name"), "type": p.get("type")} for p in participants])


@api_view(["GET"])
def find_account(request):
    """Search for an account by name + role. Returns matching accounts."""
    name = (request.query_params.get("name") or "").strip().lower()
    role = request.query_params.get("role", "participant")
    if not name:
        return Response({"error": "name required"}, status=status.HTTP_400_BAD_REQUEST)

    if role == "participant":
        all_records = fs.get_all_participants()
    elif role == "mentor":
        all_records = fs.get_all_mentors()
    else:
        return Response({"error": "role must be participant or mentor"}, status=status.HTTP_400_BAD_REQUEST)

    matches = [
        {"id": r["id"], "name": r.get("name")}
        for r in all_records
        if name in (r.get("name") or "").lower()
    ]
    return Response({"matches": matches})


@api_view(["GET"])
def get_mentor_recommendations(request, mentor_id):
    """Get participant recommendations for a mentor."""
    result = agent.get_recommendations_for_mentor(mentor_id)
    if not result["recommendations"]:
        return Response({"error": "Mentor not found"}, status=status.HTTP_404_NOT_FOUND)
    return Response(result)


@api_view(["GET"])
def programme_detail(request, programme_id):
    """
    Programme with enriched info: description, focus, participants, mentors involved.
    """
    programme = fs.get_programme(programme_id)
    if not programme:
        return Response({"error": "Programme not found"}, status=status.HTTP_404_NOT_FOUND)

    # Registered/recommended participants
    rels = fs.get_relationships({"to_entity.id": programme_id})
    participants = []
    for rel in rels:
        if rel.get("type") != "participant_programme":
            continue
        if rel.get("status") not in ("registered", "recommended", "approved", "assigned"):
            continue
        p = fs.get_participant(rel["from_entity"]["id"])
        if p:
            participants.append({
                "id": p["id"],
                "name": p.get("name"),
                "type": p.get("type"),
                "experience_level": p.get("experience_level"),
                "location": p.get("location"),
                "skills": p.get("skills", []),
                "status": rel.get("status"),
                "match_score": rel.get("match_score"),
            })

    # Mentors whose expertise overlaps programme focus (lightweight discovery)
    all_mentors = fs.get_all_mentors()
    focus_set = set(s.lower() for s in programme.get("focus", []))
    relevant_mentors = []
    for m in all_mentors:
        m_exp = set(s.lower() for s in m.get("expertise", []))
        overlap = sorted(focus_set & m_exp)
        if overlap:
            relevant_mentors.append({
                "id": m["id"],
                "name": m.get("name"),
                "expertise": m.get("expertise", []),
                "years": m.get("years"),
                "matching_focus": overlap,
            })
    relevant_mentors.sort(key=lambda m: -len(m["matching_focus"]))

    return Response({
        "programme": programme,
        "participants": participants,
        "mentors": relevant_mentors[:5],
        "stats": {
            "registered_count": sum(1 for p in participants if p["status"] in ("registered", "approved", "assigned")),
            "recommended_count": sum(1 for p in participants if p["status"] == "recommended"),
            "capacity": programme.get("capacity"),
        },
    })


@api_view(["GET"])
def explain_match(request, rel_id):
    """Return the 3-stage matching pipeline breakdown for a single relationship."""
    result = agent.explain_match(rel_id)
    if "error" in result:
        return Response(result, status=status.HTTP_404_NOT_FOUND)
    return Response(result)


@api_view(["GET"])
def get_participant_profile(request, participant_id):
    """Fetch a participant's full profile."""
    participant = fs.get_participant(participant_id)
    if not participant:
        return Response({"error": "Participant not found"}, status=status.HTTP_404_NOT_FOUND)
    return Response(participant)


@api_view(["GET"])
def get_mentor_profile(request, mentor_id):
    """Fetch a mentor's full profile."""
    mentor = fs.get_mentor(mentor_id)
    if not mentor:
        return Response({"error": "Mentor not found"}, status=status.HTTP_404_NOT_FOUND)
    return Response(mentor)
