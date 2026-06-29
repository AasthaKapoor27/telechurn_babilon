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
import traceback
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

from features import engineer_features, validate_columns, assign_risk_level, clean_and_standardize_columns

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
    Path(__file__).parent / "model.pkl"
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
            # Try default C engine first
            return pd.read_csv(buf)
        except Exception:
            try:
                # If default fails, try autodetecting delimiter (python engine)
                buf.seek(0)
                return pd.read_csv(buf, sep=None, engine="python")
            except Exception:
                try:
                    # Fallback to semicolon
                    buf.seek(0)
                    return pd.read_csv(buf, sep=";")
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

    try:
        print(f"[PREDICT] Step 1: Reading uploaded file '{file.filename}'...")
        # 1. Read file into DataFrame
        raw_df = _read_uploaded_file(file)
        
        # No hard row limit anymore; we process in chunks to prevent OOM
        
        # Clean and standardize columns (handles lowercase, strip whitespace, etc.)
        raw_df = clean_and_standardize_columns(raw_df)

        print(f"[PREDICT] Step 2: Validating required columns...")
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

        print(f"[PREDICT] Step 3: Loading pipeline...")
        # 3. Load pipeline (only once)
        pipeline = _load_pipeline()
        
        print(f"[PREDICT] Step 4: Running feature engineering and inference in batches...")
        # 4. Process in batches to save memory
        CHUNK_SIZE = 50_000
        result_chunks = []
        
        for start_idx in range(0, len(raw_df), CHUNK_SIZE):
            end_idx = start_idx + CHUNK_SIZE
            chunk_df = raw_df.iloc[start_idx:end_idx].copy()
            print(f"  -> Processing chunk {start_idx} to min({end_idx}, {len(raw_df)})...")
            
            # Feature engineering on chunk
            engineered_chunk = engineer_features(chunk_df)
            
            # Inference on chunk
            chunk_preds = pipeline.predict(engineered_chunk)
            chunk_probs = pipeline.predict_proba(engineered_chunk)[:, 1]
            
            # Build result chunk
            chunk_result = chunk_df.copy()
            chunk_result["churn_prediction"] = chunk_preds.astype(int)
            chunk_result["churn_probability"] = chunk_probs.round(4)
            chunk_result["risk_level"] = [assign_risk_level(p) for p in chunk_probs]
            
            result_chunks.append(chunk_result)
            
        print(f"[PREDICT] Step 5: Concatenating {len(result_chunks)} result batches...")
        # 5. Concatenate all batches back into a single result DataFrame
        result_df = pd.concat(result_chunks, ignore_index=True)

        print(f"[PREDICT] Step 6: Caching predictions for download...")
        # 6. Cache as CSV for /download
        _last_result_csv = result_df.to_csv(index=False)

        print(f"[PREDICT] Step 7: Sending JSON response back to frontend...")
        # 7. Return JSON
        records: list[dict[str, Any]] = json.loads(result_df.to_json(orient="records"))
        return JSONResponse(content={"count": len(records), "results": records})

    except HTTPException:
        # Let FastAPI/Starlette handle known HTTP exceptions properly
        raise
    except Exception as exc:
        # Catch absolutely anything else (OOM, pandas bug, logic error, etc.)
        print("\n--- FATAL ERROR IN /PREDICT ENDPOINT ---")
        print(traceback.format_exc())
        print("------------------------------------------\n")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "detail": "An unexpected error occurred while processing the file. Check server logs."}
        )


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
