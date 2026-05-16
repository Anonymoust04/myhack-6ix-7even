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
    if os.path.exists(key_path):
        cred = credentials.Certificate(key_path)
        firebase_admin.initialize_app(cred)
    else:
        # Fallback: use Application Default Credentials (for Cloud Run / GCP environments)
        firebase_admin.initialize_app()

db = firestore.client()


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
        return {"id": doc.id, **doc.to_dict()}
    return None


def get_all_participants() -> list[dict]:
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
    return [{"id": d.id, **d.to_dict()} for d in db.collection("programmes").stream()]


def get_programme(programme_id: str) -> Optional[dict]:
    doc = db.collection("programmes").document(programme_id).get()
    if doc.exists:
        return {"id": doc.id, **doc.to_dict()}
    return None


# ──────────────────────────────────────────────
# MENTORS
# ──────────────────────────────────────────────

def create_mentor(data: dict) -> str:
    ref = db.collection("mentors").document()
    ref.set(data)
    return ref.id


def get_all_mentors() -> list[dict]:
    return [{"id": d.id, **d.to_dict()} for d in db.collection("mentors").stream()]


# ──────────────────────────────────────────────
# COMPANIES
# ──────────────────────────────────────────────

def create_company(data: dict) -> str:
    ref = db.collection("companies").document()
    ref.set(data)
    return ref.id


def get_all_companies() -> list[dict]:
    return [{"id": d.id, **d.to_dict()} for d in db.collection("companies").stream()]


# ──────────────────────────────────────────────
# PARTNERS
# ──────────────────────────────────────────────

def create_partner(data: dict) -> str:
    ref = db.collection("partners").document()
    ref.set(data)
    return ref.id


def get_all_partners() -> list[dict]:
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
        return {"id": doc.id, **doc.to_dict()}
    return None


def get_relationships(filters: dict = None) -> list[dict]:
    """Fetch relationships, optionally filtered by status or entity ids."""
    query = db.collection("relationships")
    if filters:
        for field, value in filters.items():
            query = query.where(field, "==", value)
    return [{"id": d.id, **d.to_dict()} for d in query.stream()]


def update_relationship_status(rel_id: str, status: str):
    db.collection("relationships").document(rel_id).update({"status": status})


def log_outcome(rel_id: str, outcome: dict):
    rel_ref = db.collection("relationships").document(rel_id)
    rel_ref.update({"outcomes": firestore.ArrayUnion([outcome])})


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
    return [{"id": d.id, **d.to_dict()} for d in query.stream()]


def update_interest_request_status(req_id: str, status: str):
    db.collection("interest_requests").document(req_id).update({"status": status})


# ──────────────────────────────────────────────
# VECTOR SEARCH (Firestore built-in)
# ──────────────────────────────────────────────

def find_nearest_programmes(embedding: list[float], top_k: int = 10) -> list[dict]:
    """
    Use Firestore's built-in vector search to find the nearest programmes
    by embedding distance. Requires a vector index on the 'embedding' field.
    """
    collection = db.collection("programmes")
    results = collection.find_nearest(
        vector_field="embedding",
        query_vector=Vector(embedding),
        distance_measure=DistanceMeasure.COSINE,
        limit=top_k,
    ).stream()
    return [{"id": d.id, **d.to_dict()} for d in results]


def find_nearest_mentors(embedding: list[float], top_k: int = 10) -> list[dict]:
    collection = db.collection("mentors")
    results = collection.find_nearest(
        vector_field="embedding",
        query_vector=Vector(embedding),
        distance_measure=DistanceMeasure.COSINE,
        limit=top_k,
    ).stream()
    return [{"id": d.id, **d.to_dict()} for d in results]


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
    """Return all completed relationships (with outcomes) for analytics."""
    return get_relationships({"status": "completed"})
