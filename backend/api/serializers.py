"""
DRF serializers for request validation.
"""
from rest_framework import serializers


class ParticipantSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200)
    type = serializers.ChoiceField(choices=["student", "worker", "freelancer"])
    skills = serializers.ListField(child=serializers.CharField(), min_length=1)
    interests = serializers.ListField(child=serializers.CharField(), min_length=1)
    experience_level = serializers.ChoiceField(choices=["beginner", "intermediate", "advanced"])
    goals = serializers.ListField(child=serializers.CharField(), min_length=1)
    location = serializers.CharField(max_length=200)
    user_id = serializers.CharField(required=False, allow_blank=True)


class ProgrammeSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200)
    type = serializers.ChoiceField(choices=["hackathon", "bootcamp", "accelerator", "workshop"])
    focus = serializers.ListField(child=serializers.CharField(), min_length=1)
    difficulty = serializers.ChoiceField(choices=["beginner", "intermediate", "advanced"])
    location = serializers.CharField(max_length=200)
    dates = serializers.DictField(child=serializers.CharField())
    capacity = serializers.IntegerField(min_value=1)
    description = serializers.CharField(required=False, allow_blank=True)


class MentorSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200)
    expertise = serializers.ListField(child=serializers.CharField(), min_length=1)
    years = serializers.IntegerField(min_value=0)
    availability = serializers.CharField(max_length=200)
    bio = serializers.CharField(required=False, allow_blank=True)


class CompanySerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200)
    sector = serializers.CharField(max_length=100)
    stage = serializers.ChoiceField(choices=["idea", "pre-seed", "seed", "series-a", "growth"])
    needs = serializers.ListField(child=serializers.CharField(), min_length=1)
    description = serializers.CharField(required=False, allow_blank=True)


class OutcomeSerializer(serializers.Serializer):
    relationship_id = serializers.CharField()
    type = serializers.ChoiceField(choices=[
        "skills_gained", "project_completed", "job_landed",
        "funding_raised", "connection_made", "pivot_decision"
    ])
    details = serializers.CharField()


class AssignSerializer(serializers.Serializer):
    relationship_id = serializers.CharField()
    status = serializers.ChoiceField(choices=["assigned", "rejected", "completed"])
