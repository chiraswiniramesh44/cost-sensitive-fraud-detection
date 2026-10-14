"""CSV batch prediction using only model-compatible feature columns."""

from __future__ import annotations

import csv
import io
import logging
from typing import Any
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.app.models.user import User
from backend.app.schemas.prediction import FEATURE_NAMES, PredictionRequest
from backend.app.schemas.transaction_intake import (
    BatchPredictionResponse,
    BatchRowResult,
    DataProvenance,
    OutcomeKind,
)
from backend.app.services.feature_adapter import (
    FeatureMappingBlockedError,
    extract_model_features,
)
from backend.app.services.prediction_service import predict_and_persist

logger = logging.getLogger(__name__)

MAX_CSV_BYTES = 1_000_000  # 1 MB
MAX_CSV_ROWS = 200
REQUIRED_COLUMNS = set(FEATURE_NAMES)
OPTIONAL_ID_COLUMNS = ("transaction_id", "external_id", "id")


def _parse_csv_text(content: str) -> list[dict[str, str]]:
    reader = csv.DictReader(io.StringIO(content))
    if reader.fieldnames is None:
        raise HTTPException(status_code=400, detail="CSV has no header row.")

    headers = [name.strip() for name in reader.fieldnames if name is not None]
    header_set = set(headers)
    missing = sorted(REQUIRED_COLUMNS - header_set)
    if missing:
        raise HTTPException(
            status_code=400,
            detail=(
                "CSV is missing required model feature columns: "
                f"{missing}. Business-only CSVs cannot be scored by the "
                "current PCA model."
            ),
        )

    rows: list[dict[str, str]] = []
    for index, raw_row in enumerate(reader, start=2):
        if index - 1 > MAX_CSV_ROWS:
            raise HTTPException(
                status_code=400,
                detail=f"CSV exceeds the maximum of {MAX_CSV_ROWS} data rows.",
            )
        # Skip completely empty rows
        if raw_row is None or all(
            (value is None or str(value).strip() == "")
            for value in raw_row.values()
        ):
            continue
        normalized = {
            (key.strip() if key else key): (
                value.strip() if isinstance(value, str) else value
            )
            for key, value in raw_row.items()
            if key is not None
        }
        rows.append(normalized)

    if not rows:
        raise HTTPException(status_code=400, detail="CSV contains no data rows.")

    return rows


def validate_and_parse_csv_bytes(data: bytes, filename: str | None) -> list[dict[str, str]]:
    if filename and not filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Only .csv files are accepted.",
        )
    if len(data) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(data) > MAX_CSV_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"CSV exceeds the maximum size of {MAX_CSV_BYTES} bytes.",
        )
    try:
        text = data.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise HTTPException(
            status_code=400,
            detail="CSV must be UTF-8 encoded.",
        ) from exc
    return _parse_csv_text(text)


def _row_external_id(row: dict[str, str], row_number: int) -> str:
    for key in OPTIONAL_ID_COLUMNS:
        value = row.get(key)
        if value:
            return str(value)[:100]
    return f"csv-row-{row_number}-{uuid4().hex[:8]}"


def predict_csv_batch(
    db: Session,
    current_user: User,
    data: bytes,
    filename: str | None,
) -> BatchPredictionResponse:
    rows = validate_and_parse_csv_bytes(data, filename)
    results: list[BatchRowResult] = []
    success_count = 0
    error_count = 0

    for offset, row in enumerate(rows):
        row_number = offset + 1
        external_id = _row_external_id(row, row_number)
        try:
            features = extract_model_features(row)
            if features["Amount"] < 0:
                raise ValueError("Amount must be >= 0")

            request = PredictionRequest(
                transaction_id=external_id,
                features=features,
                data_provenance=DataProvenance.MODEL_COMPATIBLE_CSV,
                is_synthetic=False,
            )
            prediction = predict_and_persist(
                db=db,
                request=request,
                current_user=current_user,
            )
            success_count += 1
            results.append(
                BatchRowResult(
                    row_number=row_number,
                    external_id=external_id,
                    status="success",
                    transaction_id=prediction["transaction_id"],
                    fraud_probability=prediction["fraud_probability"],
                    risk_level=prediction["risk_level"],
                    decision=prediction["decision"],
                    expected_cost=prediction["expected_cost"],
                    model_version=prediction["model_version"],
                )
            )
        except FeatureMappingBlockedError as exc:
            error_count += 1
            results.append(
                BatchRowResult(
                    row_number=row_number,
                    external_id=external_id,
                    status="error",
                    error=str(exc),
                )
            )
        except HTTPException as exc:
            error_count += 1
            detail = exc.detail
            if not isinstance(detail, str):
                detail = str(detail)
            results.append(
                BatchRowResult(
                    row_number=row_number,
                    external_id=external_id,
                    status="error",
                    error=detail,
                )
            )
        except Exception as exc:
            logger.exception("Batch row %s failed", row_number)
            error_count += 1
            results.append(
                BatchRowResult(
                    row_number=row_number,
                    external_id=external_id,
                    status="error",
                    error=f"Invalid row: {exc}",
                )
            )

    return BatchPredictionResponse(
        total_rows=len(rows),
        success_count=success_count,
        error_count=error_count,
        data_provenance=DataProvenance.MODEL_COMPATIBLE_CSV,
        outcome_kind=OutcomeKind.MODEL_PREDICTION,
        is_confirmed_fraud=False,
        results=results,
    )
