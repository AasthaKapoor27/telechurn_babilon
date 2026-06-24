"""
Babylon Mobile — Telechurn Prediction API
FastAPI backend that accepts a CSV/XLSX subscriber file, runs the trained
scikit-learn Pipeline and returns churn predictions.
"""
from __future__ import annotations

import io
import os
import sys
import json
from pathlib import Path
from functools import lru_cache
from typing import Any

# Ensure the backend/ directory is on sys.path so `features` is importable
# regardless of whether uvicorn is launched from the project root or from
# inside backend/.
_BACKEND_DIR = Path(__file__).parent.resolve()
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

import joblib
import pandas as pd
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

from features import engineer_features, validate_columns, assign_risk_level

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Babylon Mobile — Telechurn Prediction API",
    description="Upload a subscriber CSV/XLSX to get churn predictions.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Same-origin in production; * keeps local dev flexible
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Model loading — cached so it is loaded exactly once per process lifetime
# ---------------------------------------------------------------------------
_MODEL_PATH_DEFAULT = str(
    Path(__file__).parent.parent / "full_churn_pipeline (1).pkl"
)


@lru_cache(maxsize=1)
def _load_pipeline():
    model_path = os.environ.get("MODEL_PATH", _MODEL_PATH_DEFAULT)
    if not Path(model_path).is_file():
        raise RuntimeError(
            f"Model file not found at '{model_path}'. "
            "Set the MODEL_PATH environment variable to the correct path."
        )
    return joblib.load(model_path)


# ---------------------------------------------------------------------------
# In-memory store for the last prediction batch (for /download)
# ---------------------------------------------------------------------------
_last_result_csv: str | None = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
ACCEPTED_EXTENSIONS = {".csv", ".xlsx", ".xls"}


def _read_uploaded_file(upload: UploadFile) -> pd.DataFrame:
    """Read CSV or Excel into a pandas DataFrame entirely in memory."""
    ext = Path(upload.filename or "").suffix.lower()
    if ext not in ACCEPTED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{ext}'. Upload a .csv or .xlsx file.",
        )

    content = upload.file.read()  # bytes — never touch disk
    buf = io.BytesIO(content)

    if ext == ".csv":
        try:
            return pd.read_csv(buf)
        except Exception as exc:
            raise HTTPException(status_code=422, detail=f"Failed to parse CSV: {exc}")
    else:
        try:
            return pd.read_excel(buf, engine="openpyxl")
        except Exception as exc:
            raise HTTPException(status_code=422, detail=f"Failed to parse Excel: {exc}")


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "service": "Babylon Telechurn API"}


@app.get("/health", tags=["Health"])
def health():
    try:
        _load_pipeline()
        return {"status": "ok", "model": "loaded"}
    except Exception as exc:
        return JSONResponse(status_code=503, content={"status": "error", "detail": str(exc)})


@app.post("/predict", tags=["Prediction"])
async def predict(file: UploadFile = File(...)):
    """
    Accept a .csv or .xlsx file with subscriber data, run the churn
    prediction pipeline and return a JSON array of results.
    """
    global _last_result_csv

    # 1. Read file into DataFrame
    raw_df = _read_uploaded_file(file)

    # 2. Validate required columns
    missing = validate_columns(raw_df)
    if missing:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "Required columns are missing from the uploaded file.",
                "missing_columns": missing,
            },
        )

    # 3. Feature engineering
    try:
        engineered_df = engineer_features(raw_df)
    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Feature engineering failed: {exc}",
        )

    # 4. Load pipeline & run inference
    try:
        pipeline = _load_pipeline()
        predictions = pipeline.predict(engineered_df)
        probabilities = pipeline.predict_proba(engineered_df)[:, 1]
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Model inference failed: {exc}",
        )

    # 5. Build result DataFrame (original raw columns + predictions)
    result_df = raw_df.copy()
    result_df["churn_prediction"] = predictions.astype(int)
    result_df["churn_probability"] = probabilities.round(4)
    result_df["risk_level"] = [assign_risk_level(p) for p in probabilities]

    # 6. Cache as CSV for /download
    _last_result_csv = result_df.to_csv(index=False)

    # 7. Return JSON
    records: list[dict[str, Any]] = json.loads(result_df.to_json(orient="records"))
    return JSONResponse(content={"count": len(records), "results": records})


@app.get("/download", tags=["Export"])
def download():
    """Return the last prediction batch as a downloadable CSV file."""
    if _last_result_csv is None:
        raise HTTPException(
            status_code=404,
            detail="No prediction batch available. Run /predict first.",
        )

    return StreamingResponse(
        io.StringIO(_last_result_csv),
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=churn_predictions.csv"
        },
    )
