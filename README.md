# SpendSense AI — Financial Transaction Anomaly Detection

[![Next.js 16](https://img.shields.io/badge/Next.js-16.4-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.3-blue?style=flat&logo=react)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-1.6-F7931E?style=flat&logo=scikit-learn)](https://scikit-learn.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS 4](https://img.shields.io/badge/TailwindCSS-4.0-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Pytest-18%2F18%20Passed-brightgreen)](./backend/tests)

**SpendSense AI** is a full-stack financial transaction anomaly detection platform. Built as an end-to-end college capstone project, it leverages unsupervised Machine Learning (**Isolation Forest**) paired with statistical heuristics (**Interquartile Range - IQR**) to inspect transaction streams, pinpoint suspicious spending activity, surface data-driven insights, and empower reviewers through an audit workflow.

---

## 🌟 Key Features

- 📁 **CSV Upload & Intelligent Schema Mapping**:
  - Drag-and-drop CSV parser with automatic column discovery (`date`, `amount`, `merchant`, `category`, etc.).
  - Real-time client-side validation, row preview, and error/warning diagnostics.
- 🤖 **Machine Learning Anomaly Detection**:
  - **Isolation Forest**: Unsupervised recursive tree partitioning for multidimensional outlier detection.
  - **Statistical IQR**: Interquartile range analysis with customizable multiplier boundaries.
  - **Combined Ensemble**: Dual-engine detection pairing heuristic thresholds with machine learning confidence scores.
  - Adjustable parameters: contamination rate ($1\% - 25\%$), tree estimators, and IQR sensitivity.
- 📊 **Interactive Financial Analytics Dashboard**:
  - High-impact KPI cards displaying total spend, anomaly count, flagged volume, and review progress.
  - Interactive charts via Recharts: chronological spend timeline, category distribution breakdown, and anomaly score distribution.
- 📋 **Audit & Transaction Workbench**:
  - TanStack Table v8 grid with multi-column sorting, debounced full-text search, and pagination.
  - Transaction state management: include/exclude from model calculations, tag review status (`Reviewed OK`, `Suspicious`, `False Positive`).
  - Slide-out detail drawer for transaction inspection.
- 📜 **Audit History & Compliance Log**:
  - Comprehensive chronological timeline logging every reviewer action, status modification, and note.
- 💾 **Export Center**:
  - One-click CSV export engine for filtered scopes: All, Clean/Included, Flagged Anomalies, Excluded, and Audit Trail logs.
- 🚀 **Dual Execution Modes**:
  - **Demo Mode**: Zero-configuration, pure in-memory execution with preloaded deterministic synthetic datasets.
  - **Production Mode**: Persistent PostgreSQL cloud database with Supabase, Row-Level Security, and automated migrations.

---

## 🏛️ Architecture Overview

```
                      ┌────────────────────────────────────────┐
                      │          Browser Client UI             │
                      │   Next.js 16 • React 19 • Tailwind CSS │
                      │       TanStack Table v8 • Recharts     │
                      └──────────────────┬─────────────────────┘
                                         │  HTTP / JSON / Multipart
                                         ▼
                      ┌────────────────────────────────────────┐
                      │          FastAPI REST Backend          │
                      │       Python 3.12+ • Uvicorn Worker    │
                      └─────────────┬──────────────────────────┘
                                    │
            ┌───────────────────────┴────────────────────────┐
            ▼                                                ▼
┌───────────────────────────────┐        ┌───────────────────────────────┐
│     Machine Learning Engine   │        │          Data Layer           │
│   Isolation Forest (scikit)   │        │  • In-Memory Store (Demo)     │
│   Statistical IQR (NumPy)     │        │  • Supabase Postgres (Prod)   │
│   StandardScaler & Encoders   │        │  • Migration SQL Scripts      │
└───────────────────────────────┘        └───────────────────────────────┘
```

---

## 🔬 Machine Learning Methodology

### 1. Feature Engineering
Raw transaction records are vectorized into normalized continuous spaces:
- **Amount Magnitude**:
  - $x_{\text{raw}}$: Signed amount
  - $x_{\text{abs}} = |x_{\text{raw}}|$
  - $x_{\text{log}} = \ln(1 + x_{\text{abs}})$ (handles heavy-tailed financial distributions)
  - $x_{\text{zscore}} = \frac{x_{\text{raw}} - \mu}{\sigma}$
- **Temporal Dynamics**:
  - Day of week ($0-6$), Day of month ($1-31$), Hour of day ($0-23$), Month ($1-12$)
- **Categorical Projections**:
  - Integer label encoding on `merchant`, `category`, `account`, and `transaction_type`.
- **Standardization**:
  - Zero-mean unit-variance transformation using `StandardScaler`.

### 2. Detection Models
- **Isolation Forest**:
  - Isolates observations by randomly choosing a feature and selecting a split value between min/max values.
  - Because anomalies are few and structurally distinct, they exhibit substantially shorter path lengths in isolation trees.
  - Decision scores are normalized to a uniform range $[0, 1]$ where 1 denotes maximum anomaly likelihood.
- **Statistical IQR**:
  - Computes quartile spread $IQR = Q_3 - Q_1$.
  - Flags values lying outside $[Q_1 - k \cdot IQR, Q_3 + k \cdot IQR]$ where $k = 1.5$.
- **Ensemble Fusion**:
  - Flags anomalies if $IsAnomaly_{IF} \lor IsAnomaly_{IQR}$.
  - Blended anomaly score: $S_{\text{ensemble}} = \frac{S_{IF} + S_{IQR}}{2}$.

---

## ⚡ Quick Start

### Prerequisites
- **Python**: 3.11+
- **Node.js**: 20+
- **npm**: 10+

### Option A: One-Command Start (Windows PowerShell)
```powershell
.\scripts\run_dev.ps1
```
*Automatically launches FastAPI on `http://localhost:8000` and Next.js on `http://localhost:3000` in separate windows.*

### Option B: Manual Setup

#### 1. Backend Setup
```bash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
- API Docs: `http://localhost:8000/docs`

#### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
- Web Application: `http://localhost:3000`

---

## 📁 Project Structure

```
spendsense/
├── backend/
│   ├── app/
│   │   ├── api/routes.py              # REST API route handlers
│   │   ├── core/config.py             # Pydantic environment configuration
│   │   ├── schemas/schemas.py         # Request/response schemas
│   │   ├── services/
│   │   │   ├── anomaly_detector.py    # Isolation Forest & IQR engine
│   │   │   ├── csv_validator.py       # CSV parser & column mapper
│   │   │   ├── data_manager.py        # In-memory demo data manager
│   │   │   └── demo_data.py           # Synthetic dataset generator
│   │   └── main.py                    # FastAPI entrypoint & CORS middleware
│   ├── tests/
│   │   ├── test_anomaly_detector.py   # Unit tests for ML models
│   │   ├── test_api.py                # Integration tests for API endpoints
│   │   ├── test_csv_validator.py      # Unit tests for CSV parser
│   │   └── test_data_manager.py       # Unit tests for data management
│   ├── requirements.txt               # Backend dependencies
│   └── .env.example                   # Environment configuration template
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx             # Root layout with fonts & SEO
│   │   │   └── page.tsx               # Main dashboard shell
│   │   ├── components/
│   │   │   ├── Sidebar.tsx            # Navigation and status footer
│   │   │   ├── Dashboard.tsx          # KPI cards and Recharts analytics
│   │   │   ├── UploadSection.tsx      # Drag-and-drop CSV upload
│   │   │   ├── AnalysisSection.tsx    # ML configuration & parameters
│   │   │   ├── TransactionTable.tsx   # TanStack Table v8 review grid
│   │   │   ├── ReviewHistory.tsx      # Audit trail timeline
│   │   │   └── ExportsSection.tsx     # CSV download center
│   │   ├── context/AppContext.tsx     # Global React state management
│   │   ├── lib/
│   │   │   ├── api.ts                 # Typed fetch client
│   │   │   └── utils.ts               # Formatting & style helpers
│   │   └── types/index.ts             # TypeScript interface definitions
│   └── package.json                   # Frontend dependencies
│
├── database/
│   └── migrations/
│       └── 001_initial_schema.sql     # PostgreSQL / Supabase schema & RLS
│
├── sample_data/                       # Ready-to-upload benchmark datasets
│   ├── transactions_clean_250.csv
│   ├── transactions_standard_500.csv
│   └── transactions_high_anomaly_1000.csv
│
├── docs/                              # Project documentation
│   ├── ARCHITECTURE.md                # System design & architecture
│   ├── API_DOCUMENTATION.md           # API reference & payload specifications
│   └── SETUP_GUIDE.md                 # Deployment & local setup guide
│
├── scripts/
│   ├── generate_sample_csv.py         # Synthetic transaction data generator
│   ├── run_dev.ps1                    # One-command developer launch script
│   └── test_all.ps1                   # Full test suite verification script
│
└── README.md                          # Project master documentation
```

---

## 🧪 Verification & Testing

Run all automated verification tests:
```powershell
.\scripts\test_all.ps1
```

Or test components individually:
```bash
# Backend pytest suite (18 tests)
cd backend
.\venv\Scripts\python -m pytest -v

# Frontend type checking and production build
cd frontend
npx next build
```

---

## 🎓 Academic Summary & Tech Highlights

- **Unsupervised Learning**: Addresses the real-world limitation of unlabeled financial transaction fraud data by using tree isolation and robust quartile measures.
- **Modular Microservices**: Decoupled Next.js client with high-performance FastAPI async server.
- **Fail-Safe Graceful Degradation**: Seamless automatic fallback to in-memory demo mode when database credentials are absent.
- **Audit Compliance**: Enterprise-grade state management preserving reviewer decisions and exclusion logs.

---

## 📄 License
This project is open-source and created for educational purposes.
