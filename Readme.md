# EcoLink AI

AI-powered ecosystem matching platform that automates relationships between participants, mentors, companies, and programmes.

## Stack
- **Backend**: Django + Django REST Framework (Python)
- **Frontend**: React + Vite
- **AI**: Vertex AI / Gemini (embeddings + scoring + summaries)
- **Database**: Firestore (with built-in vector search)

## Setup

### Prerequisites
- Python 3.9+
- Node.js 18+
- Google Cloud project with Firestore enabled
- Vertex AI API enabled on your Google Cloud project

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Copy and fill in your credentials
cp .env.example .env

# Put your Firebase service account key here
# Download from: Firebase Console > Project Settings > Service Accounts
mv ~/Downloads/your-key.json serviceAccountKey.json

# Seed demo data
python manage.py seed

# Run the server
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at http://localhost:5173 · Backend at http://localhost:8000

## Demo Accounts (no setup needed)
| Role | Login |
|------|-------|
| Participant | Click "Participant — Sarah Tan (Demo)" |
| Admin | Click "Admin (Demo)" |
| Mentor | Click "Mentor — Priya Ramasamy (Demo)" |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/register-participant` | Register participant + generate embedding |
| GET | `/api/recommendations/<id>` | Get AI programme recommendations |
| POST | `/api/register-programme` | Express interest in a programme |
| POST | `/api/create-programme` | Admin: create programme |
| POST | `/api/upload-mentors` | Admin: batch upload mentors |
| POST | `/api/run-matching` | Admin: trigger AI matching agent |
| GET | `/api/matches` | Admin: fetch ranked matches |
| POST | `/api/assign` | Admin: assign/reject a match |
| GET | `/api/analytics` | Admin: Gemini cohort insights |
| POST | `/api/outcomes` | Log a relationship outcome |

## Environment Variables

```
FIREBASE_PROJECT_ID=          # Firebase / GCP project ID
FIREBASE_SERVICE_ACCOUNT_KEY= # Path to serviceAccountKey.json
GOOGLE_CLOUD_LOCATION=        # Vertex AI region (e.g. us-central1)
DJANGO_SECRET_KEY=            # Django secret key
DEBUG=True
```