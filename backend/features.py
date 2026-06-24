"""
Feature engineering module for Telechurn Babylon.

All threshold constants are fixed training-time values computed on the full
110,035-row training dataset. They must NEVER be recomputed from an uploaded
file.
"""
import pandas as pd
import numpy as np

# ---------------------------------------------------------------------------
# Fixed training-time percentile thresholds — DO NOT CHANGE
# ---------------------------------------------------------------------------
TOTAL_SPEND_Q75: float = 73.17439999999999
GPRS_MB_Q75: float = 1421.0
GPRS_MB_MEDIAN: float = 3.0
SMS_MMS_MEDIAN: float = 0.0

REQUIRED_RAW_COLUMNS = [
    "OUT_CALLS", "CALLS_CHARGE", "SMS_MMS", "SMS_MMS_CHARGE",
    "GPRS_MB", "GPRS_CHARGE", "IDD_CALLS", "IDD_CHARGE",
    "ROAMING_CHARGE", "OTHER_CHARGE", "AGE", "Gender",
]


def validate_columns(df: pd.DataFrame) -> list[str]:
    """Return a list of missing required column names (empty = OK)."""
    return [c for c in REQUIRED_RAW_COLUMNS if c not in df.columns]


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Apply all feature engineering steps in the exact order used at training
    time.  Returns a new DataFrame that contains both the original raw columns
    and all engineered features — ColumnTransformer selects by name internally.
    """
    df = df.copy()

    numeric_cols = [
        "OUT_CALLS", "CALLS_CHARGE", "SMS_MMS", "SMS_MMS_CHARGE",
        "GPRS_MB", "GPRS_CHARGE", "IDD_CALLS", "IDD_CHARGE",
        "ROAMING_CHARGE", "OTHER_CHARGE", "AGE",
    ]
    for col in numeric_cols:
        df[col] = df[col].fillna(df[col].median())
        df[col] = df[col].clip(lower=0)

    # Gender encoding — hardcoded by exact Unicode codepoint:
    #   М (U+041C) = male   → 1
    #   Ж (U+0416) = female → 0
    #   missing / other     → -1
    gender_map = {"\u041c": 1, "\u0416": 0}
    df["Gender"] = df["Gender"].map(gender_map).fillna(-1).astype(int)

    df["total_spend"] = (
        df["CALLS_CHARGE"] + df["SMS_MMS_CHARGE"] + df["GPRS_CHARGE"]
        + df["IDD_CHARGE"] + df["ROAMING_CHARGE"] + df["OTHER_CHARGE"]
    )

    df["high_value_customer"] = (df["total_spend"] > TOTAL_SPEND_Q75).astype(int)
    df["high_data_user"] = (df["GPRS_MB"] > GPRS_MB_Q75).astype(int)
    df["is_idd_user"] = (df["IDD_CALLS"] > 0).astype(int)
    df["is_roaming_user"] = (df["ROAMING_CHARGE"] > 0).astype(int)

    df["spend_decrease_flag"] = (
        (df["OUT_CALLS"] > 0) & (df["CALLS_CHARGE"] == 0)
    ).astype(int)

    df["activity_drop_flag"] = (
        (df["OUT_CALLS"] == 0) & (df["SMS_MMS"] == 0) & (df["GPRS_MB"] == 0)
    ).astype(int)

    df["active_services_count"] = (
        (df["OUT_CALLS"] > 0).astype(int)
        + (df["SMS_MMS"] > 0).astype(int)
        + (df["GPRS_MB"] > 0).astype(int)
        + (df["IDD_CALLS"] > 0).astype(int)
        + (df["ROAMING_CHARGE"] > 0).astype(int)
    )
    df["low_activity_flag"] = (df["active_services_count"] <= 1).astype(int)

    df["age_band"] = (
        pd.cut(df["AGE"], bins=[0, 25, 35, 50, 100], labels=[0, 1, 2, 3])
        .cat.add_categories(-1)
        .fillna(-1)
        .astype(int)
    )

    df["usage_decrease_flag"] = (
        (df["GPRS_MB"] < GPRS_MB_MEDIAN) & (df["SMS_MMS"] < SMS_MMS_MEDIAN)
    ).astype(int)

    return df


def assign_risk_level(probability: float) -> str:
    if probability < 0.4:
        return "Low"
    elif probability <= 0.7:
        return "Medium"
    return "High"
