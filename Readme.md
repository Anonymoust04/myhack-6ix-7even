# 🌿 EcoLink: AI-Powered Innovation Ecosystem

EcoLink is a next-generation platform designed to bridge the gap between participants, mentors, and corporate partners within innovation ecosystems. By leveraging **Gemini 2.0 Flash** and **Firestore Vector Search**, EcoLink identifies hidden synergies and automates the matching process with unprecedented accuracy.

## 🚀 Key Features

- **🧠 Hybrid AI Matching**: Combines semantic vector embeddings (semantic similarity) with Gemini's qualitative reasoning (logical fit).
- **📈 Personalised AI Dashboards**: Every user receives a warm, LLM-generated summary explaining their ecosystem fit and recommended next steps.
- **🛡️ Vector-First Architecture**: Powered by Cloud Firestore's native vector indexing for millisecond-latency profile retrieval.
- **📊 Predictive Analytics**: Historical outcome analysis allows the platform to "learn" which types of pairings result in funding or skill acquisition.

---

## 🛠 Tech Stack

- **Frontend**: React (Vite) + Vanilla CSS (Glassmorphism UI)
- **Backend**: Django REST Framework
- **AI/LLM**: Google Gemini 2.0 Flash (`gemini-2.0-flash`)
- **Embeddings**: `gemini-embedding-2` (768 Dimensions)
- **Database**: Google Cloud Firestore (Native Mode)
- **Auth**: Firebase Authentication (Simulated for Demo)

---

## 🚦 Getting Started

### 1. Prerequisites
- Python 3.9+
- Node.js 18+
- A Google Gemini API Key ([Get one here](https://aistudio.google.com/))
- A Firebase Service Account Key (`serviceAccountKey.json`)

### 2. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in the `backend/` directory:
```env
GEMINI_API_KEY=your_key_here
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_SERVICE_ACCOUNT_KEY=./serviceAccountKey.json
```

### 3. Database Seeding (Crucial for Demo)
Populate the ecosystem with participants, mentors, and historical outcomes:
```bash
python manage.py seed
```

### 4. Running the App
**Backend:**
```bash
python manage.py runserver
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## 💡 Demo Guide

For the best hackathon presentation experience, use the **"One-Click Demo"** buttons on the login page:

1.  **Participant Dashboard**: See the **AI-Personalised Summary** and ranked programme recommendations.
2.  **Admin Dashboard**: Click **"Trigger AI Matching"** to see the system run the vector search + Gemini scoring loop in real-time.
3.  **Analytics**: View the **Gemini-Generated Cohort Insights** derived from historical ecosystem data.

---

## 🧬 Matching Algorithm Explained

EcoLink uses a **Three-Stage Pipeline**:
1.  **Vector Retrieval**: The system uses `gemini-embedding-2` to convert profiles into 768-dimensional vectors. It then performs a `find_nearest` search in Firestore using **Cosine Distance**.
2.  **Qualitative Scoring**: The top 10 candidates are sent to **Gemini 2.0 Flash** along with the context of historical successful matches.
3.  **Reasoning Generation**: Gemini produces a match score (0-1) and a natural language explanation for why the match was made.

---

Built with ❤️ for **MyHack 2026** using Google Cloud & Gemini.