"""
API URL routing for EcoLink.
"""
from django.urls import path
from . import views

urlpatterns = [
    # ── Participant ──────────────────────────────
    path("register-participant", views.register_participant, name="register-participant"),
    path("recommendations/<str:participant_id>", views.get_recommendations, name="recommendations"),
    path("register-programme", views.register_programme, name="register-programme"),
    path("my-programmes/<str:participant_id>", views.my_programmes, name="my-programmes"),

    # ── Admin ────────────────────────────────────
    path("create-programme", views.create_programme, name="create-programme"),
    path("upload-mentors", views.upload_mentors, name="upload-mentors"),
    path("upload-companies", views.upload_companies, name="upload-companies"),
    path("run-matching", views.run_matching, name="run-matching"),
    path("matches", views.get_matches, name="matches"),
    path("assign", views.assign, name="assign"),
    path("approve-registration", views.approve_registration, name="approve-registration"),
    path("pending-registrations", views.get_pending_registrations, name="pending-registrations"),
    path("analytics", views.analytics, name="analytics"),

    # ── Shared ───────────────────────────────────
    path("relationship/<str:rel_id>", views.get_relationship, name="relationship"),
    path("outcomes", views.log_outcome, name="outcomes"),

    # ── Data lists ───────────────────────────────
    path("programmes", views.list_programmes, name="programmes"),
    path("mentors", views.list_mentors, name="mentors"),
    path("companies", views.list_companies, name="companies"),
]
