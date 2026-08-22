# Yorisoi AI (寄り添いAI) — Eldercare Command Platform

> **Tagline**: Connecting care, AI that stays by your side.

Yorisoi AI is a multi-agent eldercare platform designed to assist elderly individuals, families, caregivers, and care coordinators. The platform coordinates multiple specialized AI agents to monitor health, track medication adherence, assess safety risks, and synchronize clinical decisions seamlessly across role-secured portals.

---

## 🌟 Key Features

- **Multi-Model AI Agent Pipeline**:
  - **Agent 1: Health & Wellness Agent** (Vitals & medication adherence tracking)
  - **Agent 2: Safety & Emergency Agent** (Fall risk & safety monitoring)
  - **Agent 3: Care Coordination Agent** (Follow-up ownership & caregiver coverage)
  - **Agent 4: AI Care Manager** (Orchestrates multi-agent insights & clinical recommendations)
- **Interactive AI Chat Bot Assistant**: Integrated Groq AI / Gemini AI assistant for real-time Q&A, medication guidance, and care plan explanations.
- **Role-Secured Dashboard Individuality**:
  - **🩺 Doctor Dashboard**: Clinical management, patient queue search by Name/User ID, dedicated "Update Patient Details Page", clinical notes authoring, care plan editor, follow-up scheduler, and AI recommendation review (approve/modify).
  - **💼 Compounder / Assistant Dashboard**: Dedicated appointment management portal. Allows assistants/compounders to search appointments by Patient Name or User ID and update appointment statuses (`Scheduled`, `In Progress`, `Completed`, `Rescheduled`, `Cancelled`) and scheduled dates in real time. Updates automatically propagate to Doctor, Patient, and Family dashboards.
  - **👴 Patient Dashboard (Strictly Read-Only)**: Personal health view locked to the signed-in patient's User ID. Displays Doctor-entered vitals, prescribed medications, sleep & activity, doctor notes, **approved care recommendations only**, follow-up dates & live status, Emergency SOS Help button, and easy language toggle.
  - **👨‍👩‍👧 Family Dashboard (Monitoring & Support)**: Monitoring view for family members showing patient health overview, medication status, safety logs, AI health summary, doctor-approved recommendations, and contact care team functionality.
- **No Age Limit Constraint**: Supports patients of any age (1-120).
- **User ID Authentication**: Patients sign in using numeric User IDs starting at `101` (`101`, `102`, `103`, ... `600`). New patients automatically receive sequential IDs (`601`, `602`...).
- **Instant Database Creation & Disk Persistence**: Zero-config database setup that seeds 500 patient records from dataset CSV on first boot and persists all updates actively.

---

## 🚀 Setup & Environment Configuration

### 1. Prerequisites
- Node.js 18+ installed
- npm / yarn / pnpm

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/HolyCrusaders/yorisoi-ai.git
cd yorisoi-ai

# Install dependencies
npm install
```

### 3. Environment Variables Setup (`.env.local`)

Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Open `.env.local` in your editor and configure your environment variables:

```env
# =====================================================================
# AI API KEYS (Provide Groq or Gemini key, or both)
# =====================================================================

# Option A: Groq API Key (Recommended)
# Get a free key at: https://console.groq.com/keys
GROQ_API_KEY=gsk_your_groq_api_key_here

# Option B: Gemini API Key
# Get a free key at: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=AIzaSy_your_gemini_api_key_here

# =====================================================================
# DATABASE CONFIGURATION (OPTIONAL)
# =====================================================================
# The app includes an instant, zero-config built-in database engine.
# If DATABASE_URL is not set or PostgreSQL is offline, the app automatically
# initializes and persists all 500 patient records locally!
#
# (Optional) PostgreSQL Connection URL:
# DATABASE_URL=postgresql://postgres:your_password@127.0.0.1:5434/postgres
```

### 4. Running Locally
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## 🔑 Demo Login Accounts

| Role | User ID / Email | Password | Description |
| :--- | :--- | :--- | :--- |
| **Doctor** | `doctor@yorisoi.ai` | `care2026` | Full clinical management & update access |
| **Compounder / Assistant** | `assistant@yorisoi.ai` | `care2026` | Kenji Sato · Manages & updates appointment statuses |
| **Patient** | User ID: `101` | `care2026` | Ravi Sharma · Personal read-only health portal |
| **Patient** | User ID: `102` | `care2026` | Dev Suzuki · Personal read-only health portal |
| **Family** | User ID: `101` | `care2026` | Ravi's Family · Read-only monitoring portal |

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, TailwindCSS, Lucide Icons
- **AI Engine**: Groq API (Llama 3.3 70B), Gemini API (Gemini 1.5 Flash), Hybrid Multi-Agent Pipeline
- **Database**: PostgreSQL (pg) & Instant Active Disk Store (`data/patient_store_active.json`)
- **Styling**: Modern dark teal & coral design system with glassmorphism and animations

---

## 📄 License & Disclaimer

Demo presentation artifact. All patient data is synthetic. Analysis provided is for care coordination support and does not constitute official clinical medical advice or an emergency service.
