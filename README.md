# JanSetu AI — Citizen Infrastructure Intelligence Platform (जनसेतु AI)

> **Turning Citizen Voices into Infrastructure Intelligence**  
> A Digital Public Good (DPG) prototype bridging grassroots citizen development complaints with data-driven public infrastructure planning in India.

---

## 📌 Project Overview

Governments across India receive thousands of citizen grievances and development requests daily. However, these inputs remain trapped in fragmented departmental silos and unstructured language notes. Consequently, municipal and district administrations face blind spots in public spending, unaddressed infrastructure bottlenecks, and an inability to track the real-world impact of public digital initiatives.

**JanSetu AI** solves this by offering an end-to-end multilingual intelligence platform. Citizens report issues naturally in Hindi or English (via voice or text), **Google Gemini AI** extracts structured infrastructure parameters, and an **Analytics & Hotspot Detection Engine** combines citizen demand density with demographic data and infrastructure baselines to surface prioritized demand hotspots on **Google Maps**.

---

## 🎯 Problem Statement

* **Fragmented Feedback:** Citizen requests live in disconnected portals, leading to duplicated efforts or lost grievances.
* **Language Barriers:** Citizens communicate in regional vernaculars (e.g. colloquial Hindi), which traditional keyword-based grievance portals fail to interpret effectively.
* **Unstructured Data:** Free-text descriptions lack severity indicators, precise geolocation context, and standard category classifications.
* **Misaligned Resource Allocation:** Public works departments often lack real-time hotspot detection to know which areas have the most acute infrastructure deficit relative to their population size.

---

## 💡 The Solution

JanSetu AI acts as a **Digital Public Good bridge** between citizens and policymakers:

```text
Citizen (Voice / Text in Hindi or English)
               ↓
    Flask Application Gateway
               ↓
  Google Gemini NLU Engine (Multilingual extraction)
               ↓
 Firebase Firestore Database (Structured Reports)
               ↓
  Analytics & Priority Engine (Clustering + Gap Analysis)
               ↓
Administrator Dashboard & Google Maps Hotspot Visualization
               ↓
 Evidence-based Policy & Infrastructure Planning
```

---

## 🌟 Key Features

1. **Multilingual Citizen Reporting:**
   - Report local problems in **Hindi** or **English**.
   - Browser-native speech-to-text via Web Speech API with fallback to text input.
   - Automatic browser-based or manual GPS coordinate and district detection.
2. **AI-Powered Structured Extraction (Google Gemini):**
   - Classifies complaints into standard infrastructure domains (Roads, Drinking Water, Healthcare, Education, Electricity, Sanitation, Drainage, etc.).
   - Assesses severity and urgency levels (Low, Medium, High, Critical).
   - Extracts societal impact and key semantic tags.
3. **Geospatial Demand Hotspot Detection:**
   - Clusters nearby citizen complaints by infrastructure category.
   - Calculates a transparent **AI Infrastructure Need Indicator** incorporating:
     - 30% Citizen Demand Density
     - 25% Population Impact
     - 25% Infrastructure Gap (Baseline Index)
     - 20% Severity Weight
4. **Government Administrator Dashboard:**
   - Real-time KPI summaries (Total Reports, High Priority, Hotspots, Resolved).
   - Category distribution breakdowns and district-level comparative charts.
   - Interactive Google Maps visualization with color-coded demand markers.
   - Automated AI policy synthesis summaries.
5. **Robust Demo Mode:**
   - Self-contained mock dataset and fallback engines so presentations and demonstrations work reliably without external API dependencies.

---

## 🏗️ Architecture & Technology Stack

### Frontend
- **HTML5:** Semantic, accessible markup.
- **CSS3:** Custom GovTech design system with Ashok Blue, Indian saffron/amber accents, responsive flex/grid layouts. (No Tailwind/Bootstrap).
- **Vanilla JavaScript:** Fast, modular client-side logic without heavy frameworks (React/Vue/Next.js strictly avoided).

### Backend
- **Python 3.10+ / 3.14:** Flask REST microservices.
- **Flask Framework:** Clean route and template architecture.
- **python-dotenv:** Environment isolation and configuration management.

### AI & Cloud Integrations
- **Google Gemini API:** Multilingual NLU, zero-shot infrastructure categorization, and structured JSON extraction.
- **OpenStreetMap & Leaflet.js:** Open-source geospatial mapping with custom pins, pulsing critical markers, and translucent hotspot circles.
- **Firebase Firestore:** Document database persistence with automatic JSON file fallback.
- **Explainable GovTech Analytics Engine:** 4-factor Need Indicator, demand density per 10k population, and baseline infrastructure gap correlation.

---

## 📂 Project Structure

```text
JanSetu-AI/
│
├── app.py                      # Main Flask application and API routes
├── requirements.txt            # Python dependencies
├── .env.example                # Sample environment configuration template
├── .gitignore                  # Ignored files (venv, secrets, bytecode)
├── README.md                   # Comprehensive documentation
│
├── templates/                  # Jinja2 HTML templates
│   ├── base.html               # Shared layout, navbar, gov tricolor bar, footer
│   ├── index.html              # Landing page with hero, features, workflow
│   ├── citizen.html            # Citizen problem reporting form (Voice + Text)
│   ├── dashboard.html          # Government decision-maker dashboard
│   ├── reports.html            # Public & admin reports table with search/filters
│   └── report-detail.html      # Individual report record & AI analysis view
│
├── static/                     # Static assets
│   ├── css/
│   │   └── style.css           # Global stylesheet & design system
│   ├── js/
│   │   ├── main.js             # Navigation, toasts, language switchers
│   │   ├── citizen.js          # Citizen form handler & speech recognition
│   │   ├── dashboard.js        # KPI counters, charts, & map logic
│   │   └── reports.js          # Reports table search & filtering
│   └── assets/                 # Icons and image assets
│
├── services/                   # Modular backend service layer
│   ├── __init__.py
│   ├── gemini_service.py       # Google Gemini API connector
│   ├── firebase_service.py     # Firebase Firestore database operations
│   ├── maps_service.py         # Google Maps Platform utilities
│   └── analytics_service.py    # Hotspot calculation & CSV indicator joins
│
├── data/                       # Datasets
│   ├── mock_reports.json       # Seed prototype reports
│   ├── population.csv          # District population benchmarks
│   └── infrastructure.csv      # District baseline infrastructure indices
│
└── utils/                      # Helper functions
    ├── __init__.py
    └── helpers.py              # Standardized API response formatters
```

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable | Description | Default |
| :--- | :--- | :--- |
| `FLASK_APP` | Application entrypoint | `app.py` |
| `FLASK_ENV` | Environment mode | `development` |
| `FLASK_DEBUG` | Debug mode toggle | `True` |
| `PORT` | Local web server port | `5000` |
| `SECRET_KEY` | Flask session cryptographic key | `change-in-production` |
| `GEMINI_API_KEY` | Google AI Studio API key | (Optional in Demo Mode) |
| `GOOGLE_MAPS_API_KEY` | Google Maps JavaScript API key | (Optional in Demo Mode) |
| `FIREBASE_CREDENTIALS_PATH` | Path to service account JSON | (Optional in Demo Mode) |
| `DEMO_MODE` | Enable synthetic data fallback | `True` |

---

## 🚀 Local Setup & Installation

### 1. Clone or Open the Repository
```bash
cd "c:\Users\SHIVAM SINGH\Documents\CMP"
```

### 2. Create and Activate Virtual Environment
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux / macOS
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Run the Application
```bash
python app.py
```

Open your browser and navigate to:
**`http://127.0.0.1:5000`**

---

## 🔑 External Services Configuration

### Gemini API Setup (Phase 3)
1. Get an API key from [Google AI Studio](https://aistudio.google.com/).
2. Add to `.env`:
   ```env
   GEMINI_API_KEY=your_key_here
   ```

### Firebase Firestore Setup (Phase 4)
1. Create a project in [Firebase Console](https://console.firebase.google.com/).
2. Enable Cloud Firestore.
3. Download the Service Account JSON key from Project Settings > Service Accounts.
4. Set the path in `.env`:
   ```env
   FIREBASE_CREDENTIALS_PATH=path/to/serviceAccountKey.json
   ```

### OpenStreetMap & Leaflet Setup (Geospatial Mapping)
JanSetu AI utilizes **OpenStreetMap (OSM)** and **Leaflet.js** for interactive GIS maps without requiring proprietary billing or external map quotas:
1. In `.env`, set:
   ```env
   MAP_PROVIDER=openstreetmap
   OSM_TILE_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
   ```
2. (Optional) If you have a custom tile server or API key, you can provide `OSM_API_KEY` or custom tile endpoints in `.env`.
3. To switch back to Google Maps, set `MAP_PROVIDER=google` and configure `GOOGLE_MAPS_API_KEY`.

---

## 🧪 Demo Mode (Zero-Dependency)

JanSetu AI is engineered with a built-in **Demo Mode** (`DEMO_MODE=True`). When enabled:
- The system loads pre-seeded synthetic data (`data/mock_reports.json`, `data/population.csv`, `data/infrastructure.csv`).
- Fallback NLU rules categorize complaints if Gemini API quota is exhausted or offline.
- Map markers render using demo coordinates.
- Hackathon demonstrations run smoothly without risking network hiccups or API rate limits.

---

## ☁️ Deployment Instructions

### Deploy to Google Cloud Run (Containerized Flask)
1. Ensure Docker or Google Cloud SDK is installed.
2. Build and submit container image:
   ```bash
   gcloud builds submit --tag gcr.io/[PROJECT-ID]/jansetu-ai
   ```
3. Deploy service:
   ```bash
   gcloud run deploy jansetu-ai --image gcr.io/[PROJECT-ID]/jansetu-ai --platform managed --allow-unauthenticated --region asia-south1
   ```

---

## ⚖️ Prototype Scope vs. Future Vision

| Component | Implemented Prototype | Future Production Scope |
| :--- | :--- | :--- |
| **Citizen Intake** | Web form, Hindi/English text & Web Speech API voice | WhatsApp chatbot, IVR telephony, SMS gateways |
| **Languages** | Hindi & English | 22 Scheduled Indian Languages via Bhashini AI |
| **AI Processing** | Google Gemini zero-shot classification & severity | Fine-tuned GovTech LLMs with feedback reinforcement |
| **Data Sources** | Population CSV & baseline infrastructure indicators | Live PM GatiShakti & State GIS portal APIs |
| **Decision Support** | Explainable AI Need Indicator (0-100) | Automated budget allocation recommendation workflows |

---

## 📜 License
Developed as an open Digital Public Good prototype for equitable citizen infrastructure intelligence.
