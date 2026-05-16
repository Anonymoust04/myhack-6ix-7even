"""
Gemini API wrapper for EcoLink.

Uses the google-generativeai Python SDK for:
  - Embedding generation (profile vectorisation)
  - Match scoring + reasoning
  - Personalised summary generation
  - Analytics / cohort insights
"""
import os
import json
import time
import google.generativeai as genai
from dotenv import load_dotenv
from google.api_core import exceptions

load_dotenv()

genai.configure(api_key=os.environ["GEMINI_API_KEY"])

# Use the latest Flash model for speed in hackathon context
_model = genai.GenerativeModel("gemini-2.0-flash")
_embedding_model = "models/gemini-embedding-2"


def retry_with_backoff(retries=3, backoff_in_seconds=2):
    def decorator(func):
        def wrapper(*args, **kwargs):
            x = 0
            while True:
                try:
                    return func(*args, **kwargs)
                except exceptions.ResourceExhausted as e:
                    if x == retries:
                        raise e
                    sleep = (backoff_in_seconds * 2 ** x)
                    print(f"Rate limit hit. Retrying in {sleep}s...")
                    time.sleep(sleep)
                    x += 1
                except Exception as e:
                    raise e
        return wrapper
    return decorator


@retry_with_backoff()
def generate_embedding(text: str) -> list[float]:
    """
    Generate a vector embedding for a profile text.
    Used for Firestore vector search.
    """
    result = genai.embed_content(
        model=_embedding_model,
        content=text,
        task_type="RETRIEVAL_DOCUMENT",
        output_dimensionality=768,
    )
    return result["embedding"]


def _clean_for_json(obj):
    """Recursively strip non-serializable objects (like Firestore Vectors)."""
    if isinstance(obj, dict):
        return {k: _clean_for_json(v) for k, v in obj.items() if k != "embedding"}
    elif isinstance(obj, list):
        return [_clean_for_json(x) for x in obj]
    return obj


@retry_with_backoff()
def score_match(entity_a: dict, entity_b: dict, entity_types: tuple, past_outcomes: list = None) -> dict:
    """
    Ask Gemini to score the fit between two ecosystem entities.

    Returns:
        {
          "score": float (0-1),
          "reasoning": str,
          "fit_factors": [str],
          "warnings": [str]
        }
    """
    outcomes_context = ""
    if past_outcomes:
        outcomes_context = f"\n\nHistorical outcomes from similar matches:\n{json.dumps(past_outcomes, indent=2)}"

    prompt = f"""You are an expert ecosystem coordinator evaluating match quality between ecosystem actors.

Entity A ({entity_types[0]}):
{json.dumps(_clean_for_json(entity_a), indent=2)}

Entity B ({entity_types[1]}):
{json.dumps(_clean_for_json(entity_b), indent=2)}
{outcomes_context}

Score the match quality from 0.0 to 1.0 and explain your reasoning.

Respond ONLY with valid JSON in this exact format:
{{
  "score": <float between 0 and 1>,
  "reasoning": "<2-3 sentence explanation>",
  "fit_factors": ["<factor 1>", "<factor 2>", "<factor 3>"],
  "warnings": ["<any mismatch warnings, empty list if none>"]
}}"""

    response = _model.generate_content(prompt)
    raw = response.text.strip()

    # Strip markdown code fences if present
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw.strip())


@retry_with_backoff()
def generate_summary(participant: dict, recommendations: list, past_outcomes: list = None) -> str:
    """
    Generate a personalised AI summary paragraph for the participant's dashboard.
    Called once on profile submission; stored in Firestore.
    """
    outcomes_context = ""
    if past_outcomes:
        outcomes_context = f"\nHistorical outcomes for similar participants:\n{json.dumps(past_outcomes, indent=2)}"

    prompt = f"""You are an encouraging ecosystem advisor writing a personalised match summary.

Participant profile:
{json.dumps(_clean_for_json(participant), indent=2)}

Recommended programmes with scores:
{json.dumps(_clean_for_json(recommendations), indent=2)}
{outcomes_context}

Write a warm, encouraging 3-sentence personalised summary explaining:
1. Why these programmes were recommended based on their profile
2. What similar participants with this background typically achieved
3. Which match is the strongest and why

Keep it personal, specific, and under 80 words. Do not use bullet points."""

    response = _model.generate_content(prompt)
    return response.text.strip()


@retry_with_backoff()
def generate_analytics(relationships: list, outcomes: list) -> str:
    """
    Generate a cohort-level analytics insight for the admin dashboard.
    """
    prompt = f"""You are an ecosystem analytics expert analysing programme performance data.

Relationship and outcome data:
Relationships: {json.dumps(relationships, indent=2)}
Outcomes: {json.dumps(outcomes, indent=2)}

Generate 3-5 actionable insights for programme administrators. Focus on:
- Which participant profiles succeed in which programme types
- Mentor effectiveness patterns
- Recommendations for improving future cohorts

Format as a clear numbered list. Be specific with data points where possible."""

    response = _model.generate_content(prompt)
    return response.text.strip()
