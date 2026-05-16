"""
Seed command: python manage.py seed

Pre-populates Firestore with realistic demo data:
  - 5 participants (varied backgrounds)
  - 3 programmes (hackathon, bootcamp, accelerator)
  - 4 mentors
  - 2 companies
  - 2 completed relationships with outcomes (for the learning loop)
"""
from datetime import datetime, timezone

from django.core.management.base import BaseCommand

from api import firestore_client as fs
from api import matching_agent as agent


class Command(BaseCommand):
    help = "Seed Firestore with demo data for EcoLink"

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("🌱 Seeding EcoLink demo data..."))

        # ── Programmes ───────────────────────────────────────────────────────
        self.stdout.write("Creating programmes...")
        programmes = [
            {
                "name": "AI Fintech Hackathon 2026",
                "type": "hackathon",
                "focus": ["AI", "fintech", "machine learning"],
                "difficulty": "beginner",
                "location": "Kuala Lumpur",
                "dates": {"start": "2026-06-14", "end": "2026-06-15"},
                "capacity": 50,
                "description": "48-hour hackathon building AI-powered fintech solutions.",
            },
            {
                "name": "Startup Building Bootcamp",
                "type": "bootcamp",
                "focus": ["entrepreneurship", "product", "go-to-market"],
                "difficulty": "intermediate",
                "location": "Singapore",
                "dates": {"start": "2026-07-01", "end": "2026-07-15"},
                "capacity": 30,
                "description": "2-week intensive bootcamp for early-stage founders.",
            },
            {
                "name": "APAC Deep Tech Accelerator",
                "type": "accelerator",
                "focus": ["deep tech", "AI", "sustainability", "climate"],
                "difficulty": "advanced",
                "location": "Singapore",
                "dates": {"start": "2026-08-01", "end": "2026-10-31"},
                "capacity": 15,
                "description": "3-month equity-free accelerator for deep tech startups.",
            },
            {
                "name": "Web3 Social Impact Workshop",
                "type": "workshop",
                "focus": ["blockchain", "social impact", "dao", "ethereum"],
                "difficulty": "beginner",
                "location": "Remote",
                "dates": {"start": "2026-05-20", "end": "2026-05-22"},
                "capacity": 100,
                "description": "3-day workshop on using Web3 for global social impact projects.",
            },
        ]
        programme_ids = []
        for p in programmes:
            p["created_at"] = datetime.now(timezone.utc).isoformat()
            pid = fs.create_programme(p)
            agent.generate_and_store_embedding(pid, "programme", p)
            programme_ids.append(pid)
            self.stdout.write(f"  ✓ Programme: {p['name']} ({pid})")

        # ── Mentors ──────────────────────────────────────────────────────────
        self.stdout.write("Creating mentors...")
        mentors = [
            {
                "name": "Priya Ramasamy",
                "expertise": ["AI", "machine learning", "fintech", "product strategy"],
                "years": 12,
                "availability": "Q2-Q3 2026",
                "bio": "Former Head of AI at a major SEA bank.",
            },
            {
                "name": "David Lim",
                "expertise": ["startup building", "fundraising", "go-to-market", "SaaS"],
                "years": 9,
                "availability": "Q2-Q4 2026",
                "bio": "3x founder with two successful exits.",
            },
            {
                "name": "Nurul Hassan",
                "expertise": ["regulatory compliance", "fintech", "legal", "risk management"],
                "years": 15,
                "availability": "Q2 2026",
                "bio": "Senior partner at a top fintech regulatory law firm.",
            },
            {
                "name": "Chen Wei",
                "expertise": ["deep tech", "sustainability", "climate tech", "hardware"],
                "years": 10,
                "availability": "Q3 2026",
                "bio": "Climate tech entrepreneur building carbon capture solutions.",
            },
            {
                "name": "Marcus Thorne",
                "expertise": ["cybersecurity", "blockchain", "encryption", "web3"],
                "years": 8,
                "availability": "Q2-Q3 2026",
                "bio": "CTO of a leading Web3 security auditing firm.",
            },
        ]
        mentor_ids = []
        for m in mentors:
            m["created_at"] = datetime.now(timezone.utc).isoformat()
            mid = fs.create_mentor(m)
            agent.generate_and_store_embedding(mid, "mentor", m)
            mentor_ids.append(mid)
            self.stdout.write(f"  ✓ Mentor: {m['name']} ({mid})")

        # ── Companies ────────────────────────────────────────────────────────
        self.stdout.write("Creating companies...")
        companies = [
            {
                "name": "PayEase",
                "sector": "fintech",
                "stage": "seed",
                "needs": ["regulatory compliance", "fundraising", "product strategy"],
                "description": "B2B payment infrastructure for SMEs.",
            },
            {
                "name": "GreenCarbon",
                "sector": "climate tech",
                "stage": "pre-seed",
                "needs": ["deep tech advisory", "investor introductions", "go-to-market"],
                "description": "Carbon credit marketplace using satellite data verification.",
            },
            {
                "name": "SecureChain",
                "sector": "cybersecurity",
                "stage": "series-a",
                "needs": ["market expansion", "talent acquisition", "partnership strategy"],
                "description": "Zero-trust security solutions for decentralised enterprises.",
            },
        ]
        company_ids = []
        for c in companies:
            c["created_at"] = datetime.now(timezone.utc).isoformat()
            cid = fs.create_company(c)
            agent.generate_and_store_embedding(cid, "company", c)
            company_ids.append(cid)
            self.stdout.write(f"  ✓ Company: {c['name']} ({cid})")

        # ── Participants ──────────────────────────────────────────────────────
        self.stdout.write("Creating participants...")
        participants = [
            {
                "name": "Sarah Tan",
                "type": "student",
                "skills": ["python", "data analysis", "machine learning"],
                "interests": ["AI", "fintech", "data science"],
                "experience_level": "beginner",
                "goals": ["learn startup building", "build AI projects"],
                "location": "Kuala Lumpur",
            },
            {
                "name": "Raj Krishnan",
                "type": "worker",
                "skills": ["product management", "user research", "agile", "sql"],
                "interests": ["fintech", "SaaS", "entrepreneurship"],
                "experience_level": "intermediate",
                "goals": ["launch own startup", "find co-founder"],
                "location": "Singapore",
            },
            {
                "name": "Mei Ling",
                "type": "student",
                "skills": ["react", "javascript", "ui/ux design", "figma"],
                "interests": ["AI", "sustainability", "social impact"],
                "experience_level": "beginner",
                "goals": ["build portfolio projects"],
                "location": "Kuala Lumpur",
            },
            {
                "name": "Azlan Yusof",
                "type": "freelancer",
                "skills": ["go", "cloud architecture", "kubernetes", "devops"],
                "interests": ["deep tech", "climate tech", "open source"],
                "experience_level": "advanced",
                "goals": ["join deep tech startup"],
                "location": "Kuala Lumpur",
            },
            {
                "name": "Fiona Goh",
                "type": "worker",
                "skills": ["business development", "partnerships", "financial modeling"],
                "interests": ["fintech", "entrepreneurship", "impact investing"],
                "experience_level": "intermediate",
                "goals": ["pivot to startup ecosystem"],
                "location": "Singapore",
            },
            {
                "name": "Kevin Zhang",
                "type": "student",
                "skills": ["solidity", "cryptography", "rust", "distributed systems"],
                "interests": ["blockchain", "web3", "cybersecurity"],
                "experience_level": "intermediate",
                "goals": ["contribute to open source DAOs", "build security tools"],
                "location": "Remote",
            },
            {
                "name": "Elena Rodriguez",
                "type": "freelancer",
                "skills": ["environmental science", "gis", "python", "remote sensing"],
                "interests": ["climate tech", "sustainability", "data for good"],
                "experience_level": "advanced",
                "goals": ["apply data science to climate problems", "network with climate tech founders"],
                "location": "Remote",
            },
        ]
        participant_ids = []
        for p in participants:
            p["created_at"] = datetime.now(timezone.utc).isoformat()
            pid = fs.create_participant(p)
            agent.generate_and_store_embedding(pid, "participant", p)
            participant_ids.append(pid)
            self.stdout.write(f"  ✓ Participant: {p['name']} ({pid})")

        # ── Historical outcomes (for learning loop demo) ──────────────────────
        self.stdout.write("Creating historical relationships with outcomes...")
        historical = [
            {
                "type": "participant_programme",
                "from_entity": {"id": "historical_part_001", "type": "participant"},
                "to_entity": {"id": programme_ids[0], "type": "programme"},
                "match_score": 0.92,
                "reasoning": "Strong AI + fintech alignment, beginner-friendly programme fit.",
                "fit_factors": ["interest_alignment", "difficulty_fit", "location_match"],
                "warnings": [],
                "status": "completed",
                "created_at": "2026-03-01T00:00:00+00:00",
                "engagement": {"hours": 20, "meetings": 5},
                "outcomes": [
                    {"type": "skills_gained", "details": "React, REST API design, Gemini API integration"},
                    {"type": "project_completed", "details": "Built an AI expense tracker app"},
                    {"type": "connection_made", "details": "Connected with 3 fintech founders"},
                ],
            },
            {
                "type": "mentor_company",
                "from_entity": {"id": "historical_mentor_001", "type": "mentor"},
                "to_entity": {"id": company_ids[0], "type": "company"},
                "match_score": 0.88,
                "reasoning": "Fintech regulatory expertise matches PayEase compliance needs.",
                "fit_factors": ["expertise_match", "sector_alignment"],
                "warnings": [],
                "status": "completed",
                "created_at": "2026-02-15T00:00:00+00:00",
                "engagement": {"hours": 15, "meetings": 8},
                "outcomes": [
                    {"type": "funding_raised", "details": "Supported due diligence for $500K seed round"},
                    {"type": "skills_gained", "details": "Regulatory compliance framework implemented"},
                ],
            },
        ]
        for h in historical:
            rel_id = fs.create_relationship(h)
            self.stdout.write(f"  ✓ Historical relationship: {h['type']} ({rel_id})")

        self.stdout.write(self.style.SUCCESS(
            f"\n✅ Seeding complete!\n"
            f"   {len(programme_ids)} programmes\n"
            f"   {len(mentor_ids)} mentors\n"
            f"   {len(company_ids)} companies\n"
            f"   {len(participant_ids)} participants\n"
            f"   2 historical relationships with outcomes\n\n"
            f"Next: Run matching with `POST /api/run-matching`"
        ))
