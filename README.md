<div align="center">

<img src="https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python&logoColor=white"/>
<img src="https://img.shields.io/badge/FastAPI-0.137-009688?style=for-the-badge&logo=fastapi&logoColor=white"/>
<img src="https://img.shields.io/badge/scikit--learn-1.6.1-F7931E?style=for-the-badge&logo=scikitlearn&logoColor=white"/>
<img src="https://img.shields.io/badge/XGBoost-3.2.0-EC3B2D?style=for-the-badge&logo=xgboost&logoColor=white"/>
<img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black"/>
<img src="https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white"/>
<img src="https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white"/>

# 📡 Telechurn — Babylon Mobile Churn Prediction Dashboard

**A production-ready ML analytics dashboard** that predicts telecom subscriber churn in real time using a trained XGBoost pipeline (ROC-AUC: **0.9814**).

*Built as an internal tool for Babylon Mobile — demonstrates end-to-end ML deployment: data engineering → model serving → interactive web UI.*

</div>

---

## 🎯 What This Project Demonstrates

| Skill Area | Implementation |
|---|---|
| **ML Engineering** | Trained XGBoost pipeline (scikit-learn) on 110K subscriber records |
| **Feature Engineering** | 11 derived features — behavioral flags, age bands, spend ratios |
| **Model Serving** | FastAPI ASGI app with joblib model loading, zero disk writes |
| **Data Pipeline** | In-memory CSV/Excel ingestion via pandas + openpyxl |
| **API Design** | RESTful endpoints with proper validation, 422 error handling, streaming CSV export |
| **Frontend** | React + Vite + Tailwind v4 — dark/light theme toggle, responsive down to 360px |
| **MLOps Awareness** | Pinned dependency versions, hardcoded training-time thresholds, no data leakage |
| **Deployment** | Vercel (frontend) + Render (backend) split architecture |

---

## 📸 Features

- 📤 **Drag-and-drop file upload** — accepts `.csv` and `.xlsx`, client-side preview
- ⚡ **Instant predictions** — POST to `/predict`, returns churn score per subscriber row
- 📊 **KPI summary cards** — Total, High/Medium/Low Risk counts, Avg Churn Probability — each with an animated SVG ring chart
- 🔴🟡🟢 **Color-coded risk badges** — High / Medium / Low with semantic colors that adapt to both themes
- 📋 **Paginated results table** — 25 rows/page, sortable by probability; switches to **card layout on mobile**
- 🌙☀️ **Dark / Light theme toggle** — React Context, CSS custom properties, zero localStorage
- 📥 **One-click CSV export** — downloads the full prediction batch
- 💀 **Loading skeleton** — shimmer placeholder while the API call is in flight
- 📱 **Fully responsive** — tested at 1920px, 1440px, 1024px, 768px, 480px, 360px

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Browser                            │
│  React + Vite + Tailwind v4                             │
│  • Upload zone → POST /predict                          │
│  • Summary cards + sortable paginated table             │
│  • Dark/light theme via CSS custom properties           │
└─────────────────────────────────┬───────────────────────┘
                                  │ HTTP (JSON)
                                  ▼
┌─────────────────────────────────────────────────────────┐
│                   FastAPI Backend                        │
│  POST /predict                                           │
│    └─ read CSV/XLSX into pandas (in-memory)              │
│    └─ engineer_features() — 11 derived features          │
│    └─ pipeline.predict() + predict_proba()               │
│    └─ return JSON: churn_prediction, probability, risk   │
│  GET /download — stream last batch as CSV               │
│                                                         │
│  Model: full_churn_pipeline.pkl                         │
│  └─ ColumnTransformer (StandardScaler) + XGBClassifier  │
│  └─ ROC-AUC: 0.9814 on held-out test set               │
└─────────────────────────────────────────────────────────┘
```

---

## 🧠 Model Details

| Property | Value |
|---|---|
| Algorithm | XGBoost Classifier |
| Training set | 110,035 subscriber records |
| ROC-AUC | **0.9814** |
| Pipeline | `ColumnTransformer` (scaler) → `XGBClassifier` |
| Input features | 12 raw columns → 23 features after engineering |
| Serialization | joblib pickle (`full_churn_pipeline.pkl`) |

**Feature engineering highlights:**
- `high_value_customer` — spend above training-time 75th percentile
- `activity_drop_flag` — zero calls AND zero SMS AND zero data (churn signal)
- `spend_decrease_flag` — outgoing calls with zero charge (anomaly flag)
- `age_band` — binned into 4 age cohorts
- Gender encoded from Cyrillic characters (`М`/`Ж`) to 1/0/-1

> ⚠️ Thresholds (Q75, medians) are **hardcoded from training data** and never recomputed from uploaded files — prevents distribution shift errors.

---

## 🚀 Local Setup

### Prerequisites

| Tool | Version |
|---|---|
| Python | 3.11 (required — wheels are pinned to 3.11) |
| Node.js | 18+ |
| npm | 8+ |

---

### Step 1 — Clone the repo

```bash
git clone https://github.com/AasthaKapoor27/telechurn_babilon.git
cd telechurn_babilon
```

---

### Step 2 — Place the model file

Put `full_churn_pipeline (1).pkl` in the **project root** (`telechurn_babilon/`).  
The backend looks for it there by default. Override with the `MODEL_PATH` env var if needed.

---

### Step 3 — Start the backend

Open **Terminal 1** and run:

```powershell
# Create a Python 3.11 virtual environment (must be 3.11 — scikit-learn 1.6.1 wheels are pinned)
py -3.11 -m venv .venv

# Activate it
.venv\Scripts\Activate.ps1          # Windows PowerShell
# source .venv/bin/activate           # macOS/Linux

# Install exact pinned dependencies
pip install -r backend\requirements.txt

# Start the API server
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

✅ You should see: `Application startup complete.`  
API is live at: `http://localhost:8000`  
Interactive docs: `http://localhost:8000/docs`

---

### Step 4 — Start the frontend

Open **Terminal 2** and run:

```powershell
cd frontend
npm install
npm run dev
```

✅ You should see: `Local: http://localhost:5173/`

---

### Step 5 — Open the app

👉 **http://localhost:5173**

Upload a CSV file with the required columns and click **Run Churn Prediction**.

---

## 📋 Required CSV Columns

Your upload file must contain these exact column names:

```
OUT_CALLS, CALLS_CHARGE, SMS_MMS, SMS_MMS_CHARGE, GPRS_MB, GPRS_CHARGE,
IDD_CALLS, IDD_CHARGE, ROAMING_CHARGE, OTHER_CHARGE, AGE, Gender
```

`Gender` values must be Cyrillic: `М` (male) or `Ж` (female).

---

## 🔌 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET`  | `/health`   | Check API + model load status |
| `POST` | `/predict`  | Upload `.csv`/`.xlsx`, returns JSON predictions |
| `GET`  | `/download` | Download last batch as `churn_predictions.csv` |

**Response schema (per row):**
```json
{
  "OUT_CALLS": 42,
  "churn_prediction": 1,
  "churn_probability": 0.8731,
  "risk_level": "High"
}
```

Risk thresholds: **Low** < 0.40 · **Medium** 0.40–0.70 · **High** > 0.70

---

## 📁 Project Structure

```
telechurn_babilon/
├── full_churn_pipeline (1).pkl   ← trained model (not committed)
├── requirements.txt              ← root-level copy for Vercel/Render
├── vercel.json                   ← Vercel frontend deployment
├── render.yaml                   ← Render backend deployment
├── README.md
│
├── backend/
│   ├── main.py                   ← FastAPI app (predict, download, health)
│   ├── features.py               ← feature engineering + validation
│   ├── index.py                  ← Vercel/Render ASGI entry point
│   └── requirements.txt          ← pinned Python deps
│
└── frontend/
    ├── vite.config.js            ← Vite + @tailwindcss/vite
    ├── index.html
    └── src/
        ├── App.jsx               ← root layout, theme toggle, skeleton
        ├── index.css             ← full CSS variable design system
        ├── api.js                ← fetch client
        ├── context/
        │   └── ThemeContext.jsx  ← dark/light theme state (React Context)
        └── components/
            ├── UploadZone.jsx    ← drag-and-drop upload
            ├── SummaryCards.jsx  ← KPI cards with SVG ring charts
            └── ResultsTable.jsx  ← paginated table + mobile card layout
```

---

## 🛠️ Tech Stack

**Backend**
- Python 3.11 · FastAPI · Uvicorn · pandas · joblib
- scikit-learn 1.6.1 · XGBoost 3.2.0 · LightGBM 4.6.0

**Frontend**
- React 19 · Vite 8 · Tailwind CSS v4 (via `@tailwindcss/vite`)
- Pure CSS custom properties — zero CSS-in-JS, zero component libraries

**Deployment**
- Frontend → Vercel · Backend → Render

---

## ⚙️ Environment Variables

| Variable | Default | Description |
|---|---|---|
| `MODEL_PATH` | `./full_churn_pipeline (1).pkl` | Path to the trained pipeline pickle |
| `VITE_API_URL` | `http://localhost:8000` | Backend URL (set in Vercel dashboard for production) |

---

<div align="center">
  <sub>Built with ❤️ for Babylon Mobile · Internal Analytics MVP · 2026</sub>
</div>
