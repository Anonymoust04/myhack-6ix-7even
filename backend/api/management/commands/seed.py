"""
Seed command: python manage.py seed

Pre-populates Firestore with realistic demo data:
  - 30+ participants (varied backgrounds, skills, locations)
  - 20+ programmes (diverse types and focuses)
  - 15+ mentors (varied expertise areas)
  - 5 companies
  - historical relationships with outcomes (for the learning loop)
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
                "required_skills": ["python", "data analysis"],
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
                "required_skills": ["product management", "user research"],
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
                "required_skills": ["deep tech", "hardware", "sustainability"],
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
                "required_skills": ["solidity", "blockchain"],
                "dates": {"start": "2026-05-20", "end": "2026-05-22"},
                "capacity": 100,
                "description": "3-day workshop on using Web3 for global social impact projects.",
            },
            {
                "name": "Full-Stack React Bootcamp",
                "type": "bootcamp",
                "focus": ["frontend", "react", "javascript", "web development"],
                "difficulty": "beginner",
                "location": "Kuala Lumpur",
                "required_skills": ["javascript", "react"],
                "dates": {"start": "2026-06-01", "end": "2026-06-30"},
                "capacity": 40,
                "description": "4-week intensive React and full-stack development bootcamp.",
            },
            {
                "name": "Climate Tech Innovation Summit",
                "type": "summit",
                "focus": ["climate", "sustainability", "environmental science", "green tech"],
                "difficulty": "intermediate",
                "location": "Singapore",
                "required_skills": ["environmental science", "data science"],
                "dates": {"start": "2026-07-20", "end": "2026-07-22"},
                "capacity": 200,
                "description": "3-day summit connecting climate tech entrepreneurs and investors.",
            },
            {
                "name": "Cybersecurity & Web3 Summit",
                "type": "summit",
                "focus": ["cybersecurity", "web3", "blockchain", "encryption"],
                "difficulty": "advanced",
                "location": "Remote",
                "required_skills": ["cryptography", "cybersecurity"],
                "dates": {"start": "2026-08-10", "end": "2026-08-12"},
                "capacity": 150,
                "description": "Advanced summit on Web3 security and encryption techniques.",
            },
            {
                "name": "SaaS Go-to-Market Masterclass",
                "type": "workshop",
                "focus": ["SaaS", "go-to-market", "sales", "product strategy"],
                "difficulty": "intermediate",
                "location": "Singapore",
                "required_skills": ["product management", "business development"],
                "dates": {"start": "2026-06-10", "end": "2026-06-12"},
                "capacity": 60,
                "description": "3-day masterclass on launching and scaling SaaS products.",
            },
            {
                "name": "DevOps & Cloud Architecture Bootcamp",
                "type": "bootcamp",
                "focus": ["devops", "cloud", "kubernetes", "infrastructure"],
                "difficulty": "advanced",
                "location": "Remote",
                "required_skills": ["cloud architecture", "kubernetes", "devops"],
                "dates": {"start": "2026-07-08", "end": "2026-07-22"},
                "capacity": 25,
                "description": "2-week intensive on cloud-native DevOps and Kubernetes.",
            },
            {
                "name": "Data Science for Impact Bootcamp",
                "type": "bootcamp",
                "focus": ["data science", "machine learning", "data for good", "analytics"],
                "difficulty": "intermediate",
                "location": "Kuala Lumpur",
                "required_skills": ["python", "data analysis", "machine learning"],
                "dates": {"start": "2026-06-20", "end": "2026-07-05"},
                "capacity": 35,
                "description": "3-week bootcamp applying data science to social and environmental challenges.",
            },
            {
                "name": "Business Development Masterclass",
                "type": "workshop",
                "focus": ["business development", "partnerships", "financial modeling"],
                "difficulty": "intermediate",
                "location": "Singapore",
                "required_skills": ["business development", "financial modeling"],
                "dates": {"start": "2026-05-25", "end": "2026-05-27"},
                "capacity": 50,
                "description": "3-day masterclass on partnerships, fundraising, and deal-making.",
            },
            {
                "name": "Mobile App Development Hackathon",
                "type": "hackathon",
                "focus": ["mobile", "ios", "android", "flutter"],
                "difficulty": "intermediate",
                "location": "Kuala Lumpur",
                "required_skills": ["swift", "kotlin", "flutter"],
                "dates": {"start": "2026-06-28", "end": "2026-06-30"},
                "capacity": 80,
                "description": "48-hour hackathon building iOS/Android mobile applications.",
            },
            {
                "name": "Financial Modeling & Fundraising Bootcamp",
                "type": "bootcamp",
                "focus": ["fintech", "financial modeling", "fundraising", "investor relations"],
                "difficulty": "intermediate",
                "location": "Singapore",
                "required_skills": ["financial modeling", "business development"],
                "dates": {"start": "2026-07-28", "end": "2026-08-08"},
                "capacity": 30,
                "description": "2-week intensive on financial modeling and investor pitch preparation.",
            },
            {
                "name": "UI/UX Design Masterclass",
                "type": "workshop",
                "focus": ["design", "ux", "ui", "figma", "user research"],
                "difficulty": "beginner",
                "location": "Remote",
                "required_skills": ["ui/ux design", "figma"],
                "dates": {"start": "2026-06-05", "end": "2026-06-07"},
                "capacity": 50,
                "description": "3-day masterclass on modern UI/UX design principles and tools.",
            },
            {
                "name": "Regulatory Compliance in Fintech Summit",
                "type": "summit",
                "focus": ["fintech", "regulatory", "compliance", "legal"],
                "difficulty": "advanced",
                "location": "Singapore",
                "required_skills": ["regulatory compliance", "legal"],
                "dates": {"start": "2026-08-20", "end": "2026-08-22"},
                "capacity": 120,
                "description": "Expert-led summit on navigating fintech regulation and compliance.",
            },
            {
                "name": "Open Source Contribution Workshop",
                "type": "workshop",
                "focus": ["open source", "git", "community", "software engineering"],
                "difficulty": "intermediate",
                "location": "Remote",
                "required_skills": ["software engineering", "git"],
                "dates": {"start": "2026-06-16", "end": "2026-06-18"},
                "capacity": 100,
                "description": "3-day workshop on contributing to open source projects.",
            },
            {
                "name": "Hardware & IoT Bootcamp",
                "type": "bootcamp",
                "focus": ["hardware", "iot", "embedded systems", "electronics"],
                "difficulty": "advanced",
                "location": "Singapore",
                "required_skills": ["hardware", "embedded systems"],
                "dates": {"start": "2026-08-01", "end": "2026-08-15"},
                "capacity": 20,
                "description": "2-week intensive on hardware development and IoT systems.",
            },
            {
                "name": "Growth Hacking & Analytics Summit",
                "type": "summit",
                "focus": ["growth", "marketing", "analytics", "user acquisition"],
                "difficulty": "intermediate",
                "location": "Remote",
                "required_skills": ["user research", "data analysis"],
                "dates": {"start": "2026-07-05", "end": "2026-07-07"},
                "capacity": 180,
                "description": "3-day summit on growth hacking strategies and analytics.",
            },
            {
                "name": "Venture Capital 101 Workshop",
                "type": "workshop",
                "focus": ["fundraising", "venture capital", "investor relations"],
                "difficulty": "beginner",
                "location": "Singapore",
                "required_skills": ["entrepreneurship"],
                "dates": {"start": "2026-05-30", "end": "2026-06-01"},
                "capacity": 75,
                "description": "3-day intro to venture capital and startup fundraising.",
            },
        ]
        programme_ids = []
        for p in programmes:
            p["created_at"] = datetime.now(timezone.utc).isoformat()
            pid = fs.create_programme(p)
            agent.generate_and_store_embedding(pid, "programme", p)
            programme_ids.append(pid)
            self.stdout.write(f"  ✓ Programme: {p['name']}")

        # ── Mentors ──────────────────────────────────────────────────────────
        self.stdout.write("Creating mentors...")
        mentors = [
            {
                "name": "Priya Ramasamy",
                "expertise": ["AI", "machine learning", "fintech", "product strategy"],
                "years": 12,
                "availability": "Q2-Q3 2026",
                "bio": "Former Head of AI at a major SEA bank.",
                "location": "Singapore",
            },
            {
                "name": "David Lim",
                "expertise": ["startup building", "fundraising", "go-to-market", "SaaS"],
                "years": 9,
                "availability": "Q2-Q4 2026",
                "bio": "3x founder with two successful exits.",
                "location": "Singapore",
            },
            {
                "name": "Nurul Hassan",
                "expertise": ["regulatory compliance", "fintech", "legal", "risk management"],
                "years": 15,
                "availability": "Q2 2026",
                "bio": "Senior partner at a top fintech regulatory law firm.",
                "location": "Singapore",
            },
            {
                "name": "Chen Wei",
                "expertise": ["deep tech", "sustainability", "climate tech", "hardware"],
                "years": 10,
                "availability": "Q3 2026",
                "bio": "Climate tech entrepreneur building carbon capture solutions.",
                "location": "Singapore",
            },
            {
                "name": "Marcus Thorne",
                "expertise": ["cybersecurity", "blockchain", "encryption", "web3"],
                "years": 8,
                "availability": "Q2-Q3 2026",
                "bio": "CTO of a leading Web3 security auditing firm.",
                "location": "Remote",
            },
            {
                "name": "Rachel Goldman",
                "expertise": ["product management", "user research", "agile", "product strategy"],
                "years": 11,
                "availability": "Q2-Q4 2026",
                "bio": "Former CPO at two unicorns, now advises startups.",
                "location": "Singapore",
            },
            {
                "name": "James Chen",
                "expertise": ["react", "javascript", "frontend", "web development", "ui"],
                "years": 9,
                "availability": "Q2-Q3 2026",
                "bio": "Principal engineer at major SaaS company, open source contributor.",
                "location": "Remote",
            },
            {
                "name": "Sarah Okafor",
                "expertise": ["environmental science", "gis", "data science", "climate data"],
                "years": 13,
                "availability": "Q3-Q4 2026",
                "bio": "Climate data scientist formerly at UNEP.",
                "location": "Remote",
            },
            {
                "name": "Amit Patel",
                "expertise": ["devops", "cloud architecture", "kubernetes", "infrastructure"],
                "years": 10,
                "availability": "Q2-Q4 2026",
                "bio": "Infrastructure architect at major cloud provider.",
                "location": "Remote",
            },
            {
                "name": "Li Wei",
                "expertise": ["business development", "partnerships", "financial modeling", "investor relations"],
                "years": 12,
                "availability": "Q2 2026",
                "bio": "Former VP BD at Fortune 500 company, angel investor.",
                "location": "Singapore",
            },
            {
                "name": "Emma Thompson",
                "expertise": ["design", "ux", "ui", "user research", "figma"],
                "years": 8,
                "availability": "Q2-Q3 2026",
                "bio": "Head of design at innovative fintech startup.",
                "location": "Remote",
            },
            {
                "name": "Vikram Singh",
                "expertise": ["mobile development", "ios", "android", "flutter", "swift"],
                "years": 7,
                "availability": "Q3-Q4 2026",
                "bio": "Mobile architect at major ride-hailing company.",
                "location": "Singapore",
            },
            {
                "name": "Zara Youssef",
                "expertise": ["open source", "software engineering", "git", "community building"],
                "years": 9,
                "availability": "Q2-Q4 2026",
                "bio": "Open source maintainer with 50k+ GitHub stars.",
                "location": "Remote",
            },
            {
                "name": "Tarun Reddy",
                "expertise": ["growth hacking", "marketing", "analytics", "user acquisition"],
                "years": 10,
                "availability": "Q2-Q3 2026",
                "bio": "Growth lead at unicorn fintech, now advisor.",
                "location": "Singapore",
            },
            {
                "name": "Nina Kowalski",
                "expertise": ["data science", "machine learning", "python", "analytics"],
                "years": 11,
                "availability": "Q2-Q4 2026",
                "bio": "ML engineer at research institute, data science mentor.",
                "location": "Remote",
            },
        ]
        mentor_ids = []
        for m in mentors:
            m["created_at"] = datetime.now(timezone.utc).isoformat()
            mid = fs.create_mentor(m)
            agent.generate_and_store_embedding(mid, "mentor", m)
            mentor_ids.append(mid)
            self.stdout.write(f"  ✓ Mentor: {m['name']}")

        # ── Companies ────────────────────────────────────────────────────────
        self.stdout.write("Creating companies...")
        companies = [
            {
                "name": "PayEase",
                "sector": "fintech",
                "stage": "seed",
                "needs": ["regulatory compliance", "fundraising", "product strategy"],
                "description": "B2B payment infrastructure for SMEs.",
                "location": "Singapore",
            },
            {
                "name": "GreenCarbon",
                "sector": "climate tech",
                "stage": "pre-seed",
                "needs": ["deep tech advisory", "investor introductions", "go-to-market"],
                "description": "Carbon credit marketplace using satellite data verification.",
                "location": "Singapore",
            },
            {
                "name": "SecureChain",
                "sector": "cybersecurity",
                "stage": "series-a",
                "needs": ["market expansion", "talent acquisition", "partnership strategy"],
                "description": "Zero-trust security solutions for decentralised enterprises.",
                "location": "Remote",
            },
            {
                "name": "CloudScale",
                "sector": "cloud infrastructure",
                "stage": "seed",
                "needs": ["devops expertise", "infrastructure design", "technical partnerships"],
                "description": "Serverless platform for ML workloads.",
                "location": "Singapore",
            },
            {
                "name": "DesignFlow",
                "sector": "design tools",
                "stage": "series-a",
                "needs": ["product strategy", "user research", "go-to-market"],
                "description": "AI-powered design collaboration tool.",
                "location": "Remote",
            },
        ]
        company_ids = []
        for c in companies:
            c["created_at"] = datetime.now(timezone.utc).isoformat()
            cid = fs.create_company(c)
            agent.generate_and_store_embedding(cid, "company", c)
            company_ids.append(cid)
            self.stdout.write(f"  ✓ Company: {c['name']}")

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
            {
                "name": "Dina Ahmad",
                "type": "student",
                "skills": ["swift", "ios development", "objective-c"],
                "interests": ["mobile development", "fintech", "user experience"],
                "experience_level": "intermediate",
                "goals": ["build iOS apps", "learn product management"],
                "location": "Malaysia",
            },
            {
                "name": "Hassan Mohamed",
                "type": "worker",
                "skills": ["kubernetes", "docker", "linux", "infrastructure automation"],
                "interests": ["devops", "cloud", "open source"],
                "experience_level": "intermediate",
                "goals": ["become DevOps architect", "lead infrastructure teams"],
                "location": "Singapore",
            },
            {
                "name": "Liu Chen",
                "type": "student",
                "skills": ["data science", "tensorflow", "pytorch", "statistical analysis"],
                "interests": ["AI", "machine learning", "data for good"],
                "experience_level": "intermediate",
                "goals": ["build ML models for social impact"],
                "location": "Remote",
            },
            {
                "name": "Jessica Lee",
                "type": "worker",
                "skills": ["product strategy", "market research", "analytics", "sql"],
                "interests": ["SaaS", "growth", "entrepreneurship"],
                "experience_level": "advanced",
                "goals": ["become head of product", "start a company"],
                "location": "Singapore",
            },
            {
                "name": "Marcus Johnson",
                "type": "freelancer",
                "skills": ["web3", "smart contracts", "ethereum", "defi"],
                "interests": ["blockchain", "fintech", "cryptocurrency"],
                "experience_level": "intermediate",
                "goals": ["build DeFi protocol", "learn financial systems"],
                "location": "Remote",
            },
            {
                "name": "Sophia Chen",
                "type": "student",
                "skills": ["figma", "ux research", "prototyping", "interaction design"],
                "interests": ["design", "fintech", "social impact"],
                "experience_level": "beginner",
                "goals": ["become UX designer", "design for impact"],
                "location": "Kuala Lumpur",
            },
            {
                "name": "Ravi Kapoor",
                "type": "worker",
                "skills": ["fundraising", "investor relations", "financial modeling", "strategy"],
                "interests": ["entrepreneurship", "venture capital", "impact investing"],
                "experience_level": "advanced",
                "goals": ["become VC investor", "help startups scale"],
                "location": "Singapore",
            },
            {
                "name": "Amanda Foster",
                "type": "student",
                "skills": ["python", "web development", "fullstack", "javascript"],
                "interests": ["fintech", "startups", "product"],
                "experience_level": "beginner",
                "goals": ["learn fullstack development", "join early-stage startup"],
                "location": "Remote",
            },
            {
                "name": "Karim Hassan",
                "type": "worker",
                "skills": ["android", "kotlin", "mobile development", "firebase"],
                "interests": ["mobile", "IoT", "emerging tech"],
                "experience_level": "intermediate",
                "goals": ["build mobile platform", "lead mobile team"],
                "location": "Singapore",
            },
            {
                "name": "Olivia Park",
                "type": "student",
                "skills": ["hardware", "embedded systems", "iot", "c++"],
                "interests": ["climate tech", "hardware", "sustainability"],
                "experience_level": "intermediate",
                "goals": ["build climate tech hardware"],
                "location": "Remote",
            },
            {
                "name": "Farah Khan",
                "type": "freelancer",
                "skills": ["marketing", "growth hacking", "analytics", "product marketing"],
                "interests": ["growth", "fintech", "B2B"],
                "experience_level": "advanced",
                "goals": ["lead growth for startup", "consult on growth strategy"],
                "location": "Singapore",
            },
            {
                "name": "Pascal Dubois",
                "type": "worker",
                "skills": ["backend", "python", "databases", "system design"],
                "interests": ["fintech", "scalability", "open source"],
                "experience_level": "advanced",
                "goals": ["architect payment systems"],
                "location": "Remote",
            },
            {
                "name": "Aisha Patel",
                "type": "student",
                "skills": ["data analysis", "business intelligence", "tableau", "sql"],
                "interests": ["analytics", "fintech", "data for good"],
                "experience_level": "beginner",
                "goals": ["become data analyst"],
                "location": "Kuala Lumpur",
            },
            {
                "name": "Tom Wilson",
                "type": "worker",
                "skills": ["security", "penetration testing", "cryptography", "compliance"],
                "interests": ["cybersecurity", "web3", "fintech"],
                "experience_level": "advanced",
                "goals": ["lead security team", "build secure protocols"],
                "location": "Remote",
            },
            {
                "name": "Nina Santos",
                "type": "student",
                "skills": ["nodejs", "backend", "api design", "databases"],
                "interests": ["web development", "fintech", "startups"],
                "experience_level": "intermediate",
                "goals": ["become fullstack engineer", "join startup"],
                "location": "Remote",
            },
            {
                "name": "Yuki Tanaka",
                "type": "freelancer",
                "skills": ["project management", "agile", "scrum", "team coordination"],
                "interests": ["product", "startups", "entrepreneurship"],
                "experience_level": "intermediate",
                "goals": ["become product manager"],
                "location": "Singapore",
            },
            {
                "name": "Diana Ross",
                "type": "student",
                "skills": ["machine learning", "nlp", "python", "data science"],
                "interests": ["AI", "NLP", "data science"],
                "experience_level": "intermediate",
                "goals": ["build NLP models", "work in AI company"],
                "location": "Remote",
            },
            {
                "name": "Carlos Silva",
                "type": "worker",
                "skills": ["fintech", "payments", "compliance", "regulation"],
                "interests": ["fintech", "blockchain", "payments"],
                "experience_level": "advanced",
                "goals": ["build fintech platform"],
                "location": "Singapore",
            },
            {
                "name": "Emma Watson",
                "type": "student",
                "skills": ["sustainability", "environmental science", "climate data"],
                "interests": ["climate tech", "sustainability", "data for good"],
                "experience_level": "beginner",
                "goals": ["work on climate solutions"],
                "location": "Remote",
            },
            {
                "name": "Ahmed Khan",
                "type": "freelancer",
                "skills": ["consultancy", "strategy", "go-to-market", "partnerships"],
                "interests": ["entrepreneurship", "fintech", "growth"],
                "experience_level": "advanced",
                "goals": ["advise startups", "build venture portfolio"],
                "location": "Singapore",
            },
            {
                "name": "Sophie Martin",
                "type": "student",
                "skills": ["rust", "systems programming", "blockchain"],
                "interests": ["web3", "systems", "blockchain"],
                "experience_level": "intermediate",
                "goals": ["build blockchain infrastructure"],
                "location": "Remote",
            },
            {
                "name": "Michael Zhang",
                "type": "worker",
                "skills": ["venture capital", "investment analysis", "founder coaching"],
                "interests": ["VC", "startups", "entrepreneurship"],
                "experience_level": "advanced",
                "goals": ["become VC partner", "invest in startups"],
                "location": "Singapore",
            },
            {
                "name": "Lauren Anderson",
                "type": "student",
                "skills": ["user testing", "user research", "prototyping", "figma"],
                "interests": ["design", "product", "user experience"],
                "experience_level": "beginner",
                "goals": ["become UX researcher"],
                "location": "Remote",
            },
        ]
        participant_ids = []
        for p in participants:
            p["created_at"] = datetime.now(timezone.utc).isoformat()
            pid = fs.create_participant(p)
            agent.generate_and_store_embedding(pid, "participant", p)
            participant_ids.append(pid)
            self.stdout.write(f"  ✓ Participant: {p['name']}")

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
                "type": "participant_mentor",
                "from_entity": {"id": "historical_part_001", "type": "participant"},
                "to_entity": {"id": mentor_ids[0], "type": "mentor"},
                "match_score": 0.88,
                "reasoning": "AI and fintech expertise matches participant interests perfectly.",
                "fit_factors": ["expertise_match", "interest_alignment"],
                "warnings": [],
                "status": "completed",
                "created_at": "2026-02-15T00:00:00+00:00",
                "engagement": {"hours": 15, "meetings": 8},
                "outcomes": [
                    {"type": "skills_gained", "details": "Machine learning fundamentals and fintech domain knowledge"},
                    {"type": "connection_made", "details": "Introduced to fintech founder"},
                ],
            },
        ]
        for h in historical:
            rel_id = fs.create_relationship(h)
            self.stdout.write(f"  ✓ Historical relationship: {h['type']}")

        # ── Demo Accounts ───────────────────────────────────────────────────
        self.stdout.write("Creating specific demo accounts...")

        # 1. Demo Participant
        demo_p = participants[0].copy()
        demo_p["name"] = "Demo Participant (Sarah Tan)"
        fs.db.collection("participants").document("demo_participant").set(demo_p)
        agent.generate_and_store_embedding("demo_participant", "participant", demo_p)
        fs.db.collection("users").document("demo_participant").set({
            "role": "participant",
            "entity_id": "demo_participant"
        })

        # 2. Demo Mentor
        demo_m = mentors[0].copy()
        demo_m["name"] = "Demo Mentor (Priya)"
        fs.db.collection("mentors").document("demo_mentor").set(demo_m)
        agent.generate_and_store_embedding("demo_mentor", "mentor", demo_m)
        fs.db.collection("users").document("demo_mentor").set({
            "role": "mentor",
            "entity_id": "demo_mentor"
        })

        # 3. Demo Admin
        fs.db.collection("users").document("demo_admin").set({
            "role": "admin",
            "email": "admin@ecolink.ai"
        })

        self.stdout.write("  ✓ Demo accounts created (demo_participant, demo_mentor, demo_admin)")

        self.stdout.write(self.style.SUCCESS(
            f"\n✅ Seeding complete!\n"
            f"   {len(programme_ids)} programmes\n"
            f"   {len(mentor_ids)} mentors\n"
            f"   {len(company_ids)} companies\n"
            f"   {len(participant_ids)} participants\n"
            f"   2 historical relationships with outcomes\n\n"
            f"Next: Sign up new participants and mentors to trigger real-time matching!"
        ))
