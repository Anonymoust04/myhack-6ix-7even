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
    Generates embedding and stores profile in Firestore.
    """
    serializer = ParticipantSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    data["created_at"] = datetime.now(timezone.utc).isoformat()

    # Save to Firestore first (get ID)
    participant_id = fs.create_participant(data)

    # Generate and store embedding
    try:
        agent.generate_and_store_embedding(participant_id, "participant", data)
    except Exception as e:
        # Non-fatal: embedding can be retried later
        print(f"Warning: embedding generation failed for {participant_id}: {e}")

    return Response({"id": participant_id, "message": "Participant registered"}, status=status.HTTP_201_CREATED)


@api_view(["GET"])
def get_recommendations(request, participant_id):
    """
    Get AI-matched programme recommendations for a participant.
    Returns personalised summary + ranked programme list with reasoning.
    """
    result = agent.get_recommendations_for_participant(participant_id)
    if not result["recommendations"] and not result["summary"]:
        return Response({"error": "Participant not found"}, status=status.HTTP_404_NOT_FOUND)
    return Response(result)


@api_view(["POST"])
def register_programme(request):
    """
    Participant expresses interest in a programme.
    Creates an interest_request in Firestore.
    """
    participant_id = request.data.get("participant_id")
    programme_id = request.data.get("programme_id")
    if not participant_id or not programme_id:
        return Response({"error": "participant_id and programme_id required"}, status=status.HTTP_400_BAD_REQUEST)

    req_data = {
        "from_entity": {"id": participant_id, "type": "participant"},
        "to_entity": {"id": programme_id, "type": "programme"},
        "type": "participant_to_programme",
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    req_id = fs.create_interest_request(req_data)
    return Response({"id": req_id, "message": "Registration request submitted"}, status=status.HTTP_201_CREATED)


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
    """
    mentors_data = request.data.get("mentors", [])
    if not mentors_data:
        return Response({"error": "'mentors' list required"}, status=status.HTTP_400_BAD_REQUEST)

    created_ids = []
    for mentor_data in mentors_data:
        serializer = MentorSerializer(data=mentor_data)
        if not serializer.is_valid():
            continue
        data = serializer.validated_data
        data["created_at"] = datetime.now(timezone.utc).isoformat()
        mentor_id = fs.create_mentor(data)
        try:
            agent.generate_and_store_embedding(mentor_id, "mentor", data)
        except Exception as e:
            print(f"Warning: embedding failed for mentor {mentor_id}: {e}")
        created_ids.append(mentor_id)

    return Response({"created": len(created_ids), "ids": created_ids}, status=status.HTTP_201_CREATED)


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
    Fetch ranked match relationships.
    Query params: status, type
    """
    filters = {}
    if request.query_params.get("status"):
        filters["status"] = request.query_params["status"]
    if request.query_params.get("type"):
        filters["type"] = request.query_params["type"]

    relationships = fs.get_relationships(filters or None)
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
    """Generate AI-powered cohort analytics from completed relationships."""
    completed = fs.get_completed_relationships()
    if not completed:
        return Response({"insights": "No completed relationships yet. Run some programmes first!"})

    outcomes = []
    for rel in completed:
        outcomes.extend(rel.get("outcomes", []))

    insights = gemini.generate_analytics(completed, outcomes)
    return Response({"insights": insights, "data_points": len(completed)})


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
