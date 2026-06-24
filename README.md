# Telechurn — Babylon Mobile Churn Prediction Dashboard

Internal analytics MVP for predicting subscriber churn using a trained XGBoost pipeline.

---

## Project layout

```
telechurn_babilon/
├── full_churn_pipeline (1).pkl   # trained scikit-learn Pipeline
├── feature_thresholds.json       # reference thresholds (informational)
│
├── backend/
│   ├── main.py                   # FastAPI app
│   ├── features.py               # feature engineering module
│   └── requirements.txt          # pinned Python dependencies
│
└── frontend/
    ├── index.html
    ├── vite.config.js            # Vite + Tailwind CSS v4
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css
        ├── api.js
        └── components/
            ├── UploadZone.jsx
            ├── SummaryCards.jsx
            └── ResultsTable.jsx
```

---

## Prerequisites

| Requirement | Version |
|---|---|
| Python | 3.10 + |
| Node.js | 18 + |
| npm | 8 + |

---

## Backend setup

### 1 — Create and activate a virtual environment

```powershell
# From project root
python -m venv .venv
.venv\Scripts\Activate.ps1
```

### 2 — Install exact pinned dependencies

```powershell
pip install -r backend\requirements.txt
```

> **Important:** scikit-learn and xgboost versions are pinned to **1.6.1** and **3.2.0** exactly.
> The pickle will fail to load if different versions are installed.

### 3 — Set the model path (optional)

By default the backend looks for `full_churn_pipeline (1).pkl` in the project root.
Override with an environment variable if the file is elsewhere:

```powershell
$env:MODEL_PATH = "C:\path\to\full_churn_pipeline (1).pkl"
```

### 4 — Start the API server

```powershell
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at `http://localhost:8000`.
Interactive docs: `http://localhost:8000/docs`

---

## Frontend setup

### 1 — Install dependencies

```powershell
cd frontend
npm install
```

### 2 — Start the dev server

```powershell
npm run dev
```

The dashboard will be available at `http://localhost:5173`.

---

## API reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Check API + model load status |
| POST | `/predict` | Upload `.csv` / `.xlsx`, returns JSON predictions |
| GET | `/download` | Download last batch as `churn_predictions.csv` |

### `/predict` — required CSV columns

```
OUT_CALLS, CALLS_CHARGE, SMS_MMS, SMS_MMS_CHARGE, GPRS_MB, GPRS_CHARGE,
IDD_CALLS, IDD_CHARGE, ROAMING_CHARGE, OTHER_CHARGE, AGE, Gender
```

Gender values: `М` (Cyrillic, male) or `Ж` (Cyrillic, female).

### Response schema (per row)

```jsonc
{
  "OUT_CALLS": 42,
  "churn_prediction": 1,        // 0 = retain, 1 = churn
  "churn_probability": 0.8731,  // 0.00 – 1.00
  "risk_level": "High"          // "Low" | "Medium" | "High"
}
```

Risk thresholds:
- **Low** — probability < 0.40
- **Medium** — 0.40 ≤ probability ≤ 0.70
- **High** — probability > 0.70

---

## Fixed training-time thresholds

These constants are **hardcoded** in `backend/features.py` and must never be
recomputed from an uploaded file:

```python
TOTAL_SPEND_Q75  = 73.17439999999999
GPRS_MB_Q75      = 1421.0
GPRS_MB_MEDIAN   = 3.0
SMS_MMS_MEDIAN   = 0.0
```

---

## Notes

- No files are persisted to disk during a prediction request (in-memory only).
- No authentication is implemented (MVP scope).
- The model is **never** retrained from the frontend.
- CORS is enabled for `http://localhost:5173` only.
