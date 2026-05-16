"""
Firestore CRUD helpers for EcoLink using firebase-admin Python SDK.

Collections:
  - participants
  - mentors
  - companies
  - programmes
  - relationships
  - interest_requests
  - partners
  - users
"""
import os
import firebase_admin
from firebase_admin import credentials, firestore
from google.cloud.firestore_v1.vector import Vector
from google.cloud.firestore_v1.base_vector_query import DistanceMeasure
from typing import Optional, Union
from dotenv import load_dotenv

load_dotenv()

# Initialise Firebase Admin SDK (idempotent)
if not firebase_admin._apps:
    key_path = os.environ.get("FIREBASE_SERVICE_ACCOUNT_KEY", "./serviceAccountKey.json")
    project_id = os.environ.get("FIREBASE_PROJECT_ID")
    options = {"projectId": project_id} if project_id else {}
    if os.path.exists(key_path):
        cred = credentials.Certificate(key_path)
        firebase_admin.initialize_app(cred, options)
    else:
        # Fallback: use Application Default Credentials (for Cloud Run / GCP environments)
        firebase_admin.initialize_app(options=options)

db = firestore.client()


# ──────────────────────────────────────────────
# Helper: Strip Vector objects for JSON serialization
# ──────────────────────────────────────────────

def _strip_embedding(doc_dict: dict) -> dict:
    """Remove 'embedding' field (Firestore Vector) from dict for JSON serialization."""
    return {k: v for k, v in doc_dict.items() if k != "embedding"}


# ──────────────────────────────────────────────
# PARTICIPANTS
# ──────────────────────────────────────────────

def create_participant(data: dict) -> str:
    """Save participant profile. Returns the generated doc ID."""
    ref = db.collection("participants").document()
    ref.set(data)
    return ref.id



def get_participant(participant_id: str) -> Optional[dict]:
    doc = db.collection("participants").document(participant_id).get()
    if doc.exists:
        return {"id": doc.id, **_strip_embedding(doc.to_dict())}
    return None


def _get_participant_with_embedding(participant_id: str) -> Optional[dict]:
    """Internal: fetch participant WITH embedding for matching operations."""
    doc = db.collection("participants").document(participant_id).get()
    if doc.exists:
        return {"id": doc.id, **doc.to_dict()}
    return None


def get_all_participants() -> list[dict]:
    return [{"id": d.id, **_strip_embedding(d.to_dict())} for d in db.collection("participants").stream()]


def _get_all_participants_with_embeddings() -> list[dict]:
    """Internal: fetch participants WITH embeddings for matching operations."""
    return [{"id": d.id, **d.to_dict()} for d in db.collection("participants").stream()]


def update_participant(participant_id: str, data: dict):
    db.collection("participants").document(participant_id).update(data)


# ──────────────────────────────────────────────
# PROGRAMMES
# ──────────────────────────────────────────────

def create_programme(data: dict) -> str:
    ref = db.collection("programmes").document()
    ref.set(data)
    return ref.id


def get_all_programmes() -> list[dict]:
    return [{"id": d.id, **_strip_embedding(d.to_dict())} for d in db.collection("programmes").stream()]


def get_programme(programme_id: str) -> Optional[dict]:
    doc = db.collection("programmes").document(programme_id).get()
    if doc.exists:
        return {"id": doc.id, **_strip_embedding(doc.to_dict())}
    return None


def _get_all_programmes_with_embeddings() -> list[dict]:
    """Internal: fetch programmes WITH embeddings for matching operations."""
    return [{"id": d.id, **d.to_dict()} for d in db.collection("programmes").stream()]


# ──────────────────────────────────────────────
# MENTORS
# ──────────────────────────────────────────────

def create_mentor(data: dict) -> str:
    ref = db.collection("mentors").document()
    ref.set(data)
    return ref.id


def get_mentor(mentor_id: str) -> Optional[dict]:
    doc = db.collection("mentors").document(mentor_id).get()
    if doc.exists:
        return {"id": doc.id, **_strip_embedding(doc.to_dict())}
    return None


def get_all_mentors() -> list[dict]:
    return [{"id": d.id, **_strip_embedding(d.to_dict())} for d in db.collection("mentors").stream()]


def _get_all_mentors_with_embeddings() -> list[dict]:
    """Internal: fetch mentors WITH embeddings for matching operations."""
    return [{"id": d.id, **d.to_dict()} for d in db.collection("mentors").stream()]


# ──────────────────────────────────────────────
# COMPANIES
# ──────────────────────────────────────────────

def create_company(data: dict) -> str:
    ref = db.collection("companies").document()
    ref.set(data)
    return ref.id


def get_company(company_id: str) -> Optional[dict]:
    doc = db.collection("companies").document(company_id).get()
    return {"id": doc.id, **_strip_embedding(doc.to_dict())} if doc.exists else None


def get_all_companies() -> list[dict]:
    return [{"id": d.id, **_strip_embedding(d.to_dict())} for d in db.collection("companies").stream()]


def _get_all_companies_with_embeddings() -> list[dict]:
    """Internal: fetch companies WITH embeddings for matching operations."""
    return [{"id": d.id, **d.to_dict()} for d in db.collection("companies").stream()]


# ──────────────────────────────────────────────
# PARTNERS
# ──────────────────────────────────────────────

def create_partner(data: dict) -> str:
    ref = db.collection("partners").document()
    ref.set(data)
    return ref.id


def get_all_partners() -> list[dict]:
    return [{"id": d.id, **_strip_embedding(d.to_dict())} for d in db.collection("partners").stream()]


def _get_all_partners_with_embeddings() -> list[dict]:
    """Internal: fetch partners WITH embeddings for matching operations."""
    return [{"id": d.id, **d.to_dict()} for d in db.collection("partners").stream()]


# ──────────────────────────────────────────────
# RELATIONSHIPS
# ──────────────────────────────────────────────

def create_relationship(data: dict) -> str:
    ref = db.collection("relationships").document()
    ref.set(data)
    return ref.id


def get_relationship(rel_id: str) -> Optional[dict]:
    doc = db.collection("relationships").document(rel_id).get()
    if doc.exists:
        return {"id": doc.id, **_strip_embedding(doc.to_dict())}
    return None


def get_relationships(filters: dict = None) -> list[dict]:
    """Fetch relationships, optionally filtered by status or entity ids."""
    query = db.collection("relationships")
    if filters:
        for field, value in filters.items():
            query = query.where(field, "==", value)
    return [{"id": d.id, **_strip_embedding(d.to_dict())} for d in query.stream()]


def update_relationship_status(rel_id: str, status: str):
    db.collection("relationships").document(rel_id).update({"status": status})


def log_outcome(rel_id: str, outcome: dict):
    rel_ref = db.collection("relationships").document(rel_id)
    rel_ref.update({"outcomes": firestore.ArrayUnion([outcome])})


def append_message(rel_id: str, message: dict):
    db.collection("relationships").document(rel_id).update(
        {"messages": firestore.ArrayUnion([message])}
    )


def append_feedback(rel_id: str, feedback: dict):
    db.collection("relationships").document(rel_id).update(
        {"feedback": firestore.ArrayUnion([feedback])}
    )


# ──────────────────────────────────────────────
# INTEREST REQUESTS
# ──────────────────────────────────────────────

def create_interest_request(data: dict) -> str:
    ref = db.collection("interest_requests").document()
    ref.set(data)
    return ref.id


def get_interest_requests(filters: dict = None) -> list[dict]:
    query = db.collection("interest_requests")
    if filters:
        for field, value in filters.items():
            query = query.where(field, "==", value)
    return [{"id": d.id, **_strip_embedding(d.to_dict())} for d in query.stream()]


def update_interest_request_status(req_id: str, status: str):
    db.collection("interest_requests").document(req_id).update({"status": status})


# ──────────────────────────────────────────────
# VECTOR SEARCH (Firestore built-in)
# ──────────────────────────────────────────────

def find_nearest_programmes(embedding: list[float], top_k: int = 10) -> list[dict]:
    """
    Use Firestore's built-in vector search to find the nearest programmes
    by embedding distance. Requires a vector index on the 'embedding' field.
    Returns stripped of embeddings for JSON serialization.
    """
    collection = db.collection("programmes")
    results = collection.find_nearest(
        vector_field="embedding",
        query_vector=Vector(embedding),
        distance_measure=DistanceMeasure.COSINE,
        limit=top_k,
    ).stream()
    return [{"id": d.id, **_strip_embedding(d.to_dict())} for d in results]


def find_nearest_mentors(embedding: list[float], top_k: int = 10) -> list[dict]:
    collection = db.collection("mentors")
    results = collection.find_nearest(
        vector_field="embedding",
        query_vector=Vector(embedding),
        distance_measure=DistanceMeasure.COSINE,
        limit=top_k,
    ).stream()
    return [{"id": d.id, **_strip_embedding(d.to_dict())} for d in results]


def find_nearest_participants(embedding: list[float], top_k: int = 10) -> list[dict]:
    """Find nearest participants by embedding distance for mentor matching."""
    collection = db.collection("participants")
    results = collection.find_nearest(
        vector_field="embedding",
        query_vector=Vector(embedding),
        distance_measure=DistanceMeasure.COSINE,
        limit=top_k,
    ).stream()
    return [{"id": d.id, **_strip_embedding(d.to_dict())} for d in results]


# ──────────────────────────────────────────────
# USERS
# ──────────────────────────────────────────────

def create_user(user_id: str, data: dict):
    """Store user role + entity linkage. user_id comes from Firebase Auth."""
    db.collection("users").document(user_id).set(data)


def get_user(user_id: str) -> Optional[dict]:
    doc = db.collection("users").document(user_id).get()
    if doc.exists:
        return {"id": doc.id, **doc.to_dict()}
    return None


# ──────────────────────────────────────────────
# OUTCOMES QUERY (for learning loop)
# ──────────────────────────────────────────────

def get_completed_relationships() -> list[dict]:
    """
    Relationships the matching LLM should learn from:
    completed ones (with outcomes) plus any relationship with user feedback.
    """
    completed = get_relationships({"status": "completed"})
    all_rels = get_relationships()
    with_feedback = [r for r in all_rels if r.get("feedback") and r.get("status") != "completed"]
    return completed + with_feedback
